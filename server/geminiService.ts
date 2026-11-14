import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  ChatMessage,
  DocumentChunk,
  Flashcard,
  ImportantQuestion,
  MCQQuestion,
  MockExamConfig,
  MockExamQuestion,
  QuestionCategory,
  StudyDocument,
  Topic,
  TopicSmartStudy,
  Unit,
} from '../src/types/deco.ts';
import { retrieveRelevantChunks } from '../src/utils/rag.ts';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseJsonSafe<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      return fallback;
    }
  }
}

export async function embedTexts(texts: string[]): Promise<(number[] | undefined)[]> {
  if (!texts.length || !process.env.GEMINI_API_KEY) {
    return texts.map(() => undefined);
  }
  const ai = getAiClient();
  const results: (number[] | undefined)[] = [];

  // Process in batches of 16 to respect payload sizes
  const batchSize = 16;
  for (let i = 0; i < texts.length; i += batchSize) {
    const slice = texts.slice(i, i + batchSize).map((t) => t.slice(0, 2000));
    try {
      const res = await ai.models.embedContent({
        model: 'gemini-embedding-2',
        contents: slice,
      });
      const embeddings = res.embeddings ?? [];
      for (let j = 0; j < slice.length; j++) {
        results.push(embeddings[j]?.values);
      }
    } catch {
      for (let j = 0; j < slice.length; j++) {
        results.push(undefined);
      }
    }
  }
  return results;
}

export async function embedSingleQuery(query: string): Promise<number[] | undefined> {
  const [vec] = await embedTexts([query]);
  return vec;
}

function formatChunksForPrompt(chunks: DocumentChunk[]): string {
  return chunks
    .map(
      (c, idx) =>
        `[Excerpt ${idx + 1} | Document: "${c.docName}" | Page: ${c.pageNumber}]\n${c.text}`
    )
    .join('\n\n---\n\n');
}

/**
 * Extracts the actual 5-unit DECO syllabus strictly from the user's uploaded documents.
 */
export async function extractSyllabusFromDocuments(
  documents: StudyDocument[],
  chunks: DocumentChunk[]
): Promise<Unit[]> {
  if (!documents.length || !chunks.length) {
    throw new Error('No indexed documents available for syllabus extraction.');
  }

  const ai = getAiClient();

  // Sample evenly across all documents & pages so all 5 units are represented within token budget
  const maxExcerpts = 55;
  const step = Math.max(1, Math.floor(chunks.length / maxExcerpts));
  const sampledChunks: DocumentChunk[] = [];
  for (let i = 0; i < chunks.length && sampledChunks.length < maxExcerpts; i += step) {
    sampledChunks.push(chunks[i]);
  }

  const docListSummary = documents
    .map((d) => `- "${d.name}" (${d.pageCount} pages)`)
    .join('\n');

  const prompt = `Analyze the following excerpts from the student's uploaded Digital Electronics & Computer Organization (DECO) college notes and extract the syllabus organized into FIVE UNITS (Units 1 to 5).

UPLOADED DOCUMENTS:
${docListSummary}

DOCUMENT EXCERPTS WITH EXACT DOCUMENT NAMES AND PAGE NUMBERS:
${formatChunksForPrompt(sampledChunks)}

CRITICAL ACADEMIC ACCURACY RULES:
1. Identify the ACTUAL unit titles and topics present in the provided excerpts. Do NOT invent syllabus topics or copy generic syllabi if not present in the notes.
2. If the uploaded documents only cover a subset of the 5 units, populate the units that ARE present accurately, and for any unit with no material in the uploaded notes yet, set its title to "Unit N (Awaiting Notes)" and topics to an empty array [].
3. For every topic, include ONLY definitions, formulas, worked examples, and ASCII/text diagrams supported by the excerpts, and cite the exact document name and pageNumber where it appears.
4. Keep unitNumber strictly 1, 2, 3, 4, and 5.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'You are an expert Digital Electronics and Computer Organization curriculum parser. Output strictly valid JSON matching the schema. Never fabricate page numbers or topics not present in the excerpts.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          units: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                unitNumber: { type: Type.INTEGER },
                title: { type: Type.STRING },
                overview: { type: Type.STRING },
                learningObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
                revisionSummary: { type: Type.STRING },
                sourceDocs: { type: Type.ARRAY, items: { type: Type.STRING } },
                topics: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      sourceRefs: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            docName: { type: Type.STRING },
                            pageNumber: { type: Type.INTEGER },
                            snippet: { type: Type.STRING },
                          },
                          required: ['docName', 'pageNumber'],
                        },
                      },
                      definitions: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            term: { type: Type.STRING },
                            definition: { type: Type.STRING },
                            sourceRef: { type: Type.STRING },
                          },
                          required: ['term', 'definition'],
                        },
                      },
                      formulas: { type: Type.ARRAY, items: { type: Type.STRING } },
                      diagrams: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            title: { type: Type.STRING },
                            diagramText: { type: Type.STRING },
                            caption: { type: Type.STRING },
                            sourceRef: { type: Type.STRING },
                          },
                          required: ['title', 'diagramText', 'caption'],
                        },
                      },
                      workedExamples: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            title: { type: Type.STRING },
                            problem: { type: Type.STRING },
                            solution: { type: Type.STRING },
                            sourceRef: { type: Type.STRING },
                          },
                          required: ['title', 'problem', 'solution'],
                        },
                      },
                    },
                    required: ['title', 'description'],
                  },
                },
              },
              required: ['unitNumber', 'title', 'overview', 'topics'],
            },
          },
        },
        required: ['units'],
      },
    },
  });

  const parsed = parseJsonSafe<{ units: any[] }>(response.text, { units: [] });
  const unitMap = new Map<number, Unit>();

  for (const rawUnit of parsed.units ?? []) {
    const num = Number(rawUnit.unitNumber);
    if (num < 1 || num > 5) continue;
    const unitNumber = num as 1 | 2 | 3 | 4 | 5;
    const topics: Topic[] = (rawUnit.topics ?? []).map((t: any, idx: number) => ({
      id: `u${unitNumber}_t${idx + 1}_${Date.now().toString(36)}`,
      unitNumber,
      title: String(t.title || `Topic ${idx + 1}`),
      description: String(t.description || ''),
      status: 'not_started',
      sourceRefs: Array.isArray(t.sourceRefs) ? t.sourceRefs : [],
      definitions: Array.isArray(t.definitions) ? t.definitions : [],
      formulas: Array.isArray(t.formulas) ? t.formulas : [],
      diagrams: Array.isArray(t.diagrams) ? t.diagrams : [],
      workedExamples: Array.isArray(t.workedExamples) ? t.workedExamples : [],
      revisionCount: 0,
    }));

    unitMap.set(unitNumber, {
      unitNumber,
      title: String(rawUnit.title || `Unit ${unitNumber}`),
      overview: String(rawUnit.overview || ''),
      learningObjectives: Array.isArray(rawUnit.learningObjectives) ? rawUnit.learningObjectives : [],
      revisionSummary: String(rawUnit.revisionSummary || ''),
      sourceDocs: Array.isArray(rawUnit.sourceDocs) ? rawUnit.sourceDocs : [],
      topics,
    });
  }

  const finalUnits: Unit[] = [];
  for (const n of [1, 2, 3, 4, 5] as const) {
    finalUnits.push(
      unitMap.get(n) ?? {
        unitNumber: n,
        title: `Unit ${n} (Awaiting Notes)`,
        overview: 'No content for this unit was detected in the currently uploaded notes.',
        learningObjectives: [],
        revisionSummary: '',
        sourceDocs: [],
        topics: [],
      }
    );
  }
  return finalUnits;
}

export async function generateSmartStudyForTopic(
  topic: Topic,
  unitTitle: string,
  chunks: DocumentChunk[]
): Promise<TopicSmartStudy> {
  const ai = getAiClient();
  const queryText = `${unitTitle} ${topic.title} ${topic.description}`;
  const queryVec = await embedSingleQuery(queryText);
  const retrieved = retrieveRelevantChunks(queryText, chunks, queryVec, 8);
  const contextChunks = retrieved.map((r) => r.chunk);

  const prompt = `Generate comprehensive Smart Study Mode material for the DECO topic:
Unit ${topic.unitNumber}: ${unitTitle}
Topic: ${topic.title}
Description: ${topic.description}

RETRIEVED COLLEGE NOTES EXCERPTS:
${contextChunks.length > 0 ? formatChunksForPrompt(contextChunks) : 'No excerpts retrieved.'}

Produce four distinct learning sections:
1. easyExplanation: Clear, beginner-friendly English assuming the student is learning this concept for the first time.
2. detailedNotes: Thorough engineering notes grounded in the retrieved college excerpts, preserving technical accuracy and source references [Doc, p. X].
3. examAnswers:
   - marks2: Concise 2-mark definition/core point answer.
   - marks5: Structured 5-mark answer with headings, bullet points, and an ASCII/text block diagram or truth table if relevant.
   - marks10: Comprehensive 10-mark university exam answer with introduction, working/derivation, ASCII/text diagram, example, and applications.
4. quickRevision:
   - keyPoints: 5-7 crisp exam bullet points
   - definitions: key terms and definitions
   - formulas: important Boolean/timing/architecture formulas
   - facts: high-yield exam facts
   - memoryTricks: helpful mnemonics or mental models

Only cite documents and page numbers present in the excerpts above. Do not fabricate citations.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'You are a senior Digital Electronics & Computer Organization professor. Ground all notes and citations strictly in the provided college notes excerpts.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          easyExplanation: { type: Type.STRING },
          detailedNotes: { type: Type.STRING },
          examAnswers: {
            type: Type.OBJECT,
            properties: {
              marks2: { type: Type.STRING },
              marks5: { type: Type.STRING },
              marks10: { type: Type.STRING },
            },
            required: ['marks2', 'marks5', 'marks10'],
          },
          quickRevision: {
            type: Type.OBJECT,
            properties: {
              keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
              definitions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    term: { type: Type.STRING },
                    definition: { type: Type.STRING },
                  },
                  required: ['term', 'definition'],
                },
              },
              formulas: { type: Type.ARRAY, items: { type: Type.STRING } },
              facts: { type: Type.ARRAY, items: { type: Type.STRING } },
              memoryTricks: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['keyPoints', 'definitions', 'formulas', 'facts', 'memoryTricks'],
          },
          citations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                docName: { type: Type.STRING },
                pageNumber: { type: Type.INTEGER },
                snippet: { type: Type.STRING },
              },
              required: ['docName', 'pageNumber'],
            },
          },
        },
        required: ['easyExplanation', 'detailedNotes', 'examAnswers', 'quickRevision'],
      },
    },
  });

  const parsed = parseJsonSafe<Partial<TopicSmartStudy>>(response.text, {});
  return {
    easyExplanation: parsed.easyExplanation || 'Explanation unavailable.',
    detailedNotes: parsed.detailedNotes || 'Detailed notes unavailable.',
    examAnswers: parsed.examAnswers ?? {
      marks2: '',
      marks5: '',
      marks10: '',
    },
    quickRevision: parsed.quickRevision ?? {
      keyPoints: [],
      definitions: [],
      formulas: [],
      facts: [],
      memoryTricks: [],
    },
    citations:
      parsed.citations && parsed.citations.length > 0
        ? parsed.citations
        : contextChunks.slice(0, 3).map((c) => ({
            docName: c.docName,
            pageNumber: c.pageNumber,
            snippet: c.text.slice(0, 120),
          })),
    generatedAt: new Date().toISOString(),
  };
}

export async function runRagTutorChat(params: {
  question: string;
  history: ChatMessage[];
  chunks: DocumentChunk[];
  units: Unit[];
  detailLevel: 'concise' | 'balanced' | 'comprehensive';
  preferCollegeNotesOnly: boolean;
}): Promise<{
  answer: string;
  citations: { docName: string; pageNumber: number; excerpt: string }[];
  usedSupplementaryKnowledge: boolean;
}> {
  const ai = getAiClient();
  const queryVec = await embedSingleQuery(params.question);
  const retrieved = retrieveRelevantChunks(params.question, params.chunks, queryVec, 6);
  const relevant = retrieved.filter((r) => r.score > 0.08);

  const syllabusContext = params.units
    .filter((u) => u.topics.length > 0)
    .map((u) => `Unit ${u.unitNumber} (${u.title}): ${u.topics.map((t) => t.title).join(', ')}`)
    .join('\n');

  const recentHistory = params.history
    .slice(-8)
    .map((m) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`)
    .join('\n\n');

  const retrievedText =
    relevant.length > 0
      ? formatChunksForPrompt(relevant.map((r) => r.chunk))
      : 'NO MATCHING EXCERPTS FOUND IN UPLOADED NOTES.';

  const prompt = `SYLLABUS OVERVIEW:
${syllabusContext || 'No syllabus extracted yet.'}

RETRIEVED COLLEGE NOTES EXCERPTS:
${retrievedText}

RECENT CONVERSATION:
${recentHistory || 'None'}

STUDENT QUESTION:
${params.question}`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction: `You are DECO Master AI Tutor, an academic tutor for Digital Electronics and Computer Organization (DECO).
Detail level preference: ${params.detailLevel}.
Strict Academic Integrity Rules:
1. Prioritize the student's uploaded college notes excerpts above everything else.
2. Cite sources inline as [DocumentName, p. X] ONLY for documents and page numbers actually present in the retrieved excerpts. NEVER fabricate page numbers, formulas, diagrams, or quotes.
3. ${
        params.preferCollegeNotesOnly
          ? 'If the answer is not in the uploaded college notes, explicitly state that it is not covered in the uploaded notes and ask the user to upload the relevant unit notes rather than substituting general internet knowledge.'
          : 'If the answer is NOT present in the retrieved excerpts, explicitly state: "This point is not present in your uploaded college notes." Then provide clearly labeled "Supplementary DECO Knowledge:" separately.'
      }
4. Use clean markdown headings, comparison tables (when comparing concepts), step-by-step derivations, and crisp ASCII block diagrams/truth tables where helpful.
5. Return valid JSON matching the schema.`,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          answer: { type: Type.STRING },
          usedSupplementaryKnowledge: { type: Type.BOOLEAN },
          citedSources: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                docName: { type: Type.STRING },
                pageNumber: { type: Type.INTEGER },
                excerpt: { type: Type.STRING },
              },
              required: ['docName', 'pageNumber', 'excerpt'],
            },
          },
        },
        required: ['answer', 'usedSupplementaryKnowledge'],
      },
    },
  });

  const parsed = parseJsonSafe<{
    answer?: string;
    usedSupplementaryKnowledge?: boolean;
    citedSources?: { docName: string; pageNumber: number; excerpt: string }[];
  }>(response.text, {});

  const fallbackCitations = relevant.slice(0, 3).map((r) => ({
    docName: r.chunk.docName,
    pageNumber: r.chunk.pageNumber,
    excerpt: r.chunk.text.slice(0, 140),
  }));

  return {
    answer: parsed.answer || 'Unable to generate a response right now. Please try again.',
    citations:
      parsed.citedSources && parsed.citedSources.length > 0
        ? parsed.citedSources
        : fallbackCitations,
    usedSupplementaryKnowledge: Boolean(parsed.usedSupplementaryKnowledge),
  };
}

export async function generateImportantQuestionsForUnit(params: {
  unit: Unit;
  category: QuestionCategory | 'all';
  count: number;
  chunks: DocumentChunk[];
}): Promise<ImportantQuestion[]> {
  const ai = getAiClient();
  const topicNames = params.unit.topics.map((t) => t.title).join(', ');
  const query = `Unit ${params.unit.unitNumber} ${params.unit.title} ${topicNames}`;
  const qVec = await embedSingleQuery(query);
  const retrieved = retrieveRelevantChunks(query, params.chunks, qVec, 10);

  const catRule =
    params.category === 'all'
      ? 'Mix across 2-mark, 5-mark, 10-mark, definition, numerical, and diagram categories. Only include "repeated" if past paper repetition is explicitly noted in the excerpts.'
      : `Focus on category "${params.category}".`;

  const prompt = `Generate ${params.count} university exam Important Questions for:
Unit ${params.unit.unitNumber}: ${params.unit.title}
Topics in this unit: ${topicNames || params.unit.overview}
Category requirement: ${catRule}

COLLEGE NOTES EXCERPTS:
${formatChunksForPrompt(retrieved.map((r) => r.chunk))}

For each question provide:
- topicTitle (matching one of the unit's topics)
- category ('2-mark' | '5-mark' | '10-mark' | 'repeated' | 'definition' | 'numerical' | 'diagram')
- question
- answer (complete, exam-ready structured answer)
- diagram (optional ASCII logic/architecture diagram or truth table if required)
- keywords (3-6 important exam keywords)
- marks (2, 5, or 10)
- sourceRef (exact "DocName, p. X" from the excerpts above)`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topicTitle: { type: Type.STRING },
                category: { type: Type.STRING },
                question: { type: Type.STRING },
                answer: { type: Type.STRING },
                diagram: { type: Type.STRING },
                keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                marks: { type: Type.INTEGER },
                sourceRef: { type: Type.STRING },
              },
              required: ['topicTitle', 'category', 'question', 'answer', 'keywords', 'marks', 'sourceRef'],
            },
          },
        },
        required: ['questions'],
      },
    },
  });

  const parsed = parseJsonSafe<{ questions: any[] }>(response.text, { questions: [] });
  return (parsed.questions ?? []).map((q, idx) => ({
    id: `iq_u${params.unit.unitNumber}_${Date.now().toString(36)}_${idx}`,
    unitNumber: params.unit.unitNumber,
    topicTitle: String(q.topicTitle || params.unit.title),
    category: (q.category || '5-mark') as QuestionCategory,
    question: String(q.question || ''),
    answer: String(q.answer || ''),
    diagram: q.diagram ? String(q.diagram) : undefined,
    keywords: Array.isArray(q.keywords) ? q.keywords.map(String) : [],
    marks: Number(q.marks) || 5,
    sourceRef: String(q.sourceRef || 'Uploaded Notes'),
    bookmarked: false,
  }));
}

export async function generateMcqsFromNotes(params: {
  units: Unit[];
  unitNumber?: 1 | 2 | 3 | 4 | 5;
  topicTitle?: string;
  count: number;
  chunks: DocumentChunk[];
}): Promise<MCQQuestion[]> {
  const ai = getAiClient();
  const targetUnits = params.unitNumber
    ? params.units.filter((u) => u.unitNumber === params.unitNumber)
    : params.units.filter((u) => u.topics.length > 0);

  const scopeText = params.topicTitle
    ? `Topic: ${params.topicTitle}`
    : targetUnits.map((u) => `Unit ${u.unitNumber}: ${u.title} (${u.topics.map((t) => t.title).join(', ')})`).join('\n');

  const qVec = await embedSingleQuery(scopeText);
  const retrieved = retrieveRelevantChunks(scopeText, params.chunks, qVec, 12);

  const prompt = `Generate ${params.count} multiple-choice questions strictly from the student's DECO syllabus and uploaded college notes below.
Do NOT generate questions outside this syllabus scope.

SYLLABUS SCOPE:
${scopeText}

COLLEGE NOTES EXCERPTS:
${formatChunksForPrompt(retrieved.map((r) => r.chunk))}

Each question MUST have:
- unitNumber (1-5)
- topicTitle
- question
- options (array of exactly 4 distinct strings)
- correctIndex (0, 1, 2, or 3)
- explanation (why the correct answer is right)
- wrongOptionNotes (brief note on why the distractors are incorrect)
- sourceRef (exact "DocName, p. X")`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          mcqs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                unitNumber: { type: Type.INTEGER },
                topicTitle: { type: Type.STRING },
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
                wrongOptionNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
                sourceRef: { type: Type.STRING },
              },
              required: ['unitNumber', 'topicTitle', 'question', 'options', 'correctIndex', 'explanation', 'sourceRef'],
            },
          },
        },
        required: ['mcqs'],
      },
    },
  });

  const parsed = parseJsonSafe<{ mcqs: any[] }>(response.text, { mcqs: [] });
  return (parsed.mcqs ?? [])
    .filter((m) => Array.isArray(m.options) && m.options.length === 4)
    .map((m, idx) => ({
      id: `mcq_${Date.now().toString(36)}_${idx}`,
      unitNumber: (Math.min(5, Math.max(1, Number(m.unitNumber) || params.unitNumber || 1))) as 1 | 2 | 3 | 4 | 5,
      topicTitle: String(m.topicTitle || params.topicTitle || 'DECO'),
      question: String(m.question),
      options: [String(m.options[0]), String(m.options[1]), String(m.options[2]), String(m.options[3])],
      correctIndex: Math.min(3, Math.max(0, Number(m.correctIndex) || 0)),
      explanation: String(m.explanation),
      wrongOptionNotes: Array.isArray(m.wrongOptionNotes) ? m.wrongOptionNotes.map(String) : [],
      sourceRef: String(m.sourceRef || 'Uploaded Notes'),
    }));
}

export async function generateFlashcardsFromNotes(params: {
  unit: Unit;
  count: number;
  chunks: DocumentChunk[];
}): Promise<Flashcard[]> {
  const ai = getAiClient();
  const topicList = params.unit.topics.map((t) => t.title).join(', ');
  const query = `Unit ${params.unit.unitNumber} ${params.unit.title} ${topicList}`;
  const qVec = await embedSingleQuery(query);
  const retrieved = retrieveRelevantChunks(query, params.chunks, qVec, 10);

  const prompt = `Generate ${params.count} crisp study flashcards from the uploaded DECO college notes for:
Unit ${params.unit.unitNumber}: ${params.unit.title}
Topics: ${topicList}

EXCERPTS:
${formatChunksForPrompt(retrieved.map((r) => r.chunk))}

Each card should have a clear question/concept on the front and a concise, accurate answer/formula on the back with sourceRef ("DocName, p. X").`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          flashcards: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topicTitle: { type: Type.STRING },
                front: { type: Type.STRING },
                back: { type: Type.STRING },
                sourceRef: { type: Type.STRING },
              },
              required: ['topicTitle', 'front', 'back', 'sourceRef'],
            },
          },
        },
        required: ['flashcards'],
      },
    },
  });

  const parsed = parseJsonSafe<{ flashcards: any[] }>(response.text, { flashcards: [] });
  return (parsed.flashcards ?? []).map((c, idx) => ({
    id: `fc_u${params.unit.unitNumber}_${Date.now().toString(36)}_${idx}`,
    unitNumber: params.unit.unitNumber,
    topicTitle: String(c.topicTitle || params.unit.title),
    front: String(c.front || ''),
    back: String(c.back || ''),
    difficulty: 'unrated',
    sourceRef: String(c.sourceRef || 'Uploaded Notes'),
  }));
}

export async function generateMockExamQuestions(params: {
  config: MockExamConfig;
  units: Unit[];
  chunks: DocumentChunk[];
}): Promise<MockExamQuestion[]> {
  const ai = getAiClient();
  const targetUnits =
    params.config.scope === 'unit' && params.config.unitNumber
      ? params.units.filter((u) => u.unitNumber === params.config.unitNumber)
      : params.units.filter((u) => u.topics.length > 0);

  const scopeDesc = targetUnits
    .map((u) => `Unit ${u.unitNumber}: ${u.title} (${u.topics.map((t) => t.title).join(', ')})`)
    .join('\n');

  const qVec = await embedSingleQuery(scopeDesc);
  const retrieved = retrieveRelevantChunks(scopeDesc, params.chunks, qVec, 14);

  const prompt = `Build a realistic DECO Mock Examination paper with ${params.config.questionCount} questions totaling approximately ${params.config.totalMarks} marks.
Scope: ${params.config.scope === 'unit' ? `Unit ${params.config.unitNumber}` : 'Full 5-Unit Syllabus'}
Allowed categories: ${params.config.categories.join(', ')}

SYLLABUS:
${scopeDesc}

NOTES EXCERPTS:
${formatChunksForPrompt(retrieved.map((r) => r.chunk))}

Include MCQ options (4 options + correctOptionIndex 0-3) for objective/2-mark items where appropriate, and modelAnswer + grading keywords (3-6 key terms) for every question.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                unitNumber: { type: Type.INTEGER },
                topicTitle: { type: Type.STRING },
                category: { type: Type.STRING },
                marks: { type: Type.INTEGER },
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctOptionIndex: { type: Type.INTEGER },
                modelAnswer: { type: Type.STRING },
                keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                sourceRef: { type: Type.STRING },
              },
              required: ['unitNumber', 'topicTitle', 'category', 'marks', 'question', 'modelAnswer', 'keywords', 'sourceRef'],
            },
          },
        },
        required: ['questions'],
      },
    },
  });

  const parsed = parseJsonSafe<{ questions: any[] }>(response.text, { questions: [] });
  return (parsed.questions ?? []).map((q, idx) => {
    const hasOptions = Array.isArray(q.options) && q.options.length === 4;
    return {
      id: `mockq_${Date.now().toString(36)}_${idx}`,
      unitNumber: (Math.min(5, Math.max(1, Number(q.unitNumber) || params.config.unitNumber || 1))) as 1 | 2 | 3 | 4 | 5,
      topicTitle: String(q.topicTitle || 'DECO'),
      category: (q.category || '5-mark') as QuestionCategory,
      marks: Math.max(1, Number(q.marks) || 2),
      question: String(q.question),
      options: hasOptions
        ? [String(q.options[0]), String(q.options[1]), String(q.options[2]), String(q.options[3])]
        : undefined,
      correctOptionIndex: hasOptions ? Math.min(3, Math.max(0, Number(q.correctOptionIndex) || 0)) : undefined,
      modelAnswer: String(q.modelAnswer || ''),
      keywords: Array.isArray(q.keywords) ? q.keywords.map(String) : [],
      sourceRef: String(q.sourceRef || 'Uploaded Notes'),
    };
  });
}

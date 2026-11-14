import type {
  ActivityItem,
  GlobalSearchResult,
  ImportantQuestion,
  MCQQuestion,
  MockExamAttempt,
  MockExamConfig,
  MockExamQuestion,
  MockExamUserResponse,
  QuizAnswerRecord,
  QuizAttempt,
  StudyDocument,
  Topic,
  Unit,
} from '../types/deco.ts';

export interface UnitProgressSummary {
  unitNumber: number;
  totalTopics: number;
  completedTopics: number;
  inProgressTopics: number;
  notStartedTopics: number;
  percentage: number;
}

export interface OverallProgressSummary {
  totalTopics: number;
  completedTopics: number;
  inProgressTopics: number;
  percentage: number;
  unitSummaries: UnitProgressSummary[];
}

export function calculateUnitProgress(unit: Unit): UnitProgressSummary {
  const totalTopics = unit.topics.length;
  const completedTopics = unit.topics.filter((t) => t.status === 'completed').length;
  const inProgressTopics = unit.topics.filter((t) => t.status === 'in_progress').length;
  const notStartedTopics = totalTopics - completedTopics - inProgressTopics;
  const percentage = totalTopics === 0 ? 0 : Math.round((completedTopics / totalTopics) * 100);

  return {
    unitNumber: unit.unitNumber,
    totalTopics,
    completedTopics,
    inProgressTopics,
    notStartedTopics,
    percentage,
  };
}

export function calculateOverallProgress(units: Unit[]): OverallProgressSummary {
  const unitSummaries = units.map(calculateUnitProgress);
  const totalTopics = unitSummaries.reduce((sum, u) => sum + u.totalTopics, 0);
  const completedTopics = unitSummaries.reduce((sum, u) => sum + u.completedTopics, 0);
  const inProgressTopics = unitSummaries.reduce((sum, u) => sum + u.inProgressTopics, 0);
  const percentage = totalTopics === 0 ? 0 : Math.round((completedTopics / totalTopics) * 100);

  return {
    totalTopics,
    completedTopics,
    inProgressTopics,
    percentage,
    unitSummaries,
  };
}

export interface AnalyticsSummary {
  totalQuestionsAttempted: number;
  averageQuizScore: number;
  averageMockScore: number;
  weakTopics: { topicTitle: string; unitNumber: number; accuracyPercent: number; attempts: number }[];
  mostRevisedTopics: { topicId: string; title: string; unitNumber: number; revisionCount: number }[];
  recommendations: string[];
}

export function calculateAnalyticsSummary(
  units: Unit[],
  quizAttempts: QuizAttempt[],
  mockAttempts: MockExamAttempt[]
): AnalyticsSummary {
  const totalQuestionsAttempted = quizAttempts.reduce((sum, a) => sum + a.totalQuestions, 0);
  const averageQuizScore =
    quizAttempts.length === 0
      ? 0
      : Math.round(quizAttempts.reduce((sum, a) => sum + a.scorePercent, 0) / quizAttempts.length);

  const averageMockScore =
    mockAttempts.length === 0
      ? 0
      : Math.round(mockAttempts.reduce((sum, m) => sum + m.percentage, 0) / mockAttempts.length);

  const topicStats = new Map<string, { unitNumber: number; correct: number; total: number }>();
  for (const attempt of quizAttempts) {
    for (const ans of attempt.answers) {
      const existing = topicStats.get(ans.topicTitle) ?? {
        unitNumber: ans.unitNumber,
        correct: 0,
        total: 0,
      };
      existing.total += 1;
      if (ans.isCorrect) existing.correct += 1;
      topicStats.set(ans.topicTitle, existing);
    }
  }

  const weakTopics = Array.from(topicStats.entries())
    .map(([topicTitle, stat]) => ({
      topicTitle,
      unitNumber: stat.unitNumber,
      accuracyPercent: Math.round((stat.correct / stat.total) * 100),
      attempts: stat.total,
    }))
    .filter((item) => item.accuracyPercent < 75)
    .sort((a, b) => a.accuracyPercent - b.accuracyPercent)
    .slice(0, 6);

  const allTopics: Topic[] = units.flatMap((u) => u.topics);
  const mostRevisedTopics = [...allTopics]
    .filter((t) => t.revisionCount > 0)
    .sort((a, b) => b.revisionCount - a.revisionCount)
    .slice(0, 5)
    .map((t) => ({
      topicId: t.id,
      title: t.title,
      unitNumber: t.unitNumber,
      revisionCount: t.revisionCount,
    }));

  const recommendations: string[] = [];
  if (allTopics.length === 0) {
    recommendations.push('Upload your DECO PDF notes or sync your Google Drive folder to extract the 5-unit syllabus.');
  } else {
    if (weakTopics.length > 0) {
      recommendations.push(
        `Prioritize revising "${weakTopics[0].topicTitle}" (Unit ${weakTopics[0].unitNumber}) where accuracy is ${weakTopics[0].accuracyPercent}%.`
      );
    }
    const notStartedUnit = units.find((u) => u.topics.some((t) => t.status === 'not_started'));
    if (notStartedUnit) {
      const nextTopic = notStartedUnit.topics.find((t) => t.status === 'not_started');
      if (nextTopic) {
        recommendations.push(
          `Continue Unit ${notStartedUnit.unitNumber} with "${nextTopic.title}" in Smart Study Mode.`
        );
      }
    }
    if (quizAttempts.length === 0 && allTopics.length > 0) {
      recommendations.push('Take a 5-question Practice Test on Unit 1 to establish a baseline score.');
    }
  }

  return {
    totalQuestionsAttempted,
    averageQuizScore,
    averageMockScore,
    weakTopics,
    mostRevisedTopics,
    recommendations,
  };
}

export function scoreQuizAttempt(params: {
  id: string;
  mode: QuizAttempt['mode'];
  unitNumber?: number;
  topicId?: string;
  questions: MCQQuestion[];
  selections: Record<string, number>;
  timeTakenSeconds: number;
  createdAt?: string;
}): QuizAttempt {
  const answers: QuizAnswerRecord[] = params.questions.map((q) => {
    const selectedIndex = params.selections[q.id] ?? -1;
    const isCorrect = selectedIndex === q.correctIndex;
    return {
      questionId: q.id,
      topicTitle: q.topicTitle,
      unitNumber: q.unitNumber,
      selectedIndex,
      correctIndex: q.correctIndex,
      isCorrect,
    };
  });

  const correctCount = answers.filter((a) => a.isCorrect).length;
  const totalQuestions = params.questions.length;
  const scorePercent = totalQuestions === 0 ? 0 : Math.round((correctCount / totalQuestions) * 100);

  const missedTopicCounts = new Map<string, number>();
  for (const ans of answers) {
    if (!ans.isCorrect) {
      missedTopicCounts.set(ans.topicTitle, (missedTopicCounts.get(ans.topicTitle) ?? 0) + 1);
    }
  }

  const weakTopics = Array.from(missedTopicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([topic]) => topic);

  return {
    id: params.id,
    mode: params.mode,
    unitNumber: params.unitNumber,
    topicId: params.topicId,
    totalQuestions,
    correctCount,
    scorePercent,
    timeTakenSeconds: params.timeTakenSeconds,
    weakTopics,
    recommendedTopics: weakTopics.slice(0, 3),
    createdAt: params.createdAt ?? new Date().toISOString(),
    answers,
  };
}

export function scoreMockExam(params: {
  id: string;
  config: MockExamConfig;
  questions: MockExamQuestion[];
  userResponses: Record<string, MockExamUserResponse>;
  startedAt: string;
  submittedAt?: string;
  timeSpentSeconds: number;
}): MockExamAttempt {
  let scoreObtained = 0;
  let totalMarks = 0;
  const unitMap = new Map<number, { obtained: number; total: number }>();
  const weakTopicSet = new Set<string>();

  for (const q of params.questions) {
    totalMarks += q.marks;
    const unitStat = unitMap.get(q.unitNumber) ?? { obtained: 0, total: 0 };
    unitStat.total += q.marks;

    const resp = params.userResponses[q.id];
    let earned = 0;

    if (q.options && typeof q.correctOptionIndex === 'number') {
      if (resp?.selectedOption === q.correctOptionIndex) {
        earned = q.marks;
      } else {
        weakTopicSet.add(q.topicTitle);
      }
    } else if (resp?.textAnswer && resp.textAnswer.trim().length > 0) {
      const lowerAns = resp.textAnswer.toLowerCase();
      const matchedKeywords = q.keywords.filter((kw) =>
        lowerAns.includes(kw.toLowerCase())
      ).length;
      const keywordRatio = q.keywords.length > 0 ? matchedKeywords / q.keywords.length : 0.5;
      const lengthFactor = Math.min(1, resp.textAnswer.trim().split(/\s+/).length / Math.max(12, q.marks * 10));
      const ratio = Math.min(1, keywordRatio * 0.7 + lengthFactor * 0.3);
      earned = Math.round(q.marks * ratio * 2) / 2;
      if (earned < q.marks * 0.6) {
        weakTopicSet.add(q.topicTitle);
      }
    } else {
      weakTopicSet.add(q.topicTitle);
    }

    scoreObtained += earned;
    unitStat.obtained += earned;
    unitMap.set(q.unitNumber, unitStat);
  }

  const percentage = totalMarks === 0 ? 0 : Math.round((scoreObtained / totalMarks) * 100);
  const unitBreakdown = Array.from(unitMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([unitNumber, val]) => ({
      unitNumber,
      obtained: val.obtained,
      total: val.total,
    }));

  return {
    id: params.id,
    config: params.config,
    startedAt: params.startedAt,
    submittedAt: params.submittedAt ?? new Date().toISOString(),
    timeSpentSeconds: params.timeSpentSeconds,
    scoreObtained,
    totalMarks,
    percentage,
    unitBreakdown,
    weakTopics: Array.from(weakTopicSet),
    questions: params.questions,
    userResponses: params.userResponses,
  };
}

export function searchWorkspace(params: {
  query: string;
  units: Unit[];
  documents: StudyDocument[];
  importantQuestions: ImportantQuestion[];
  flashcards: { id: string; unitNumber: number; topicTitle: string; front: string; back: string }[];
}): GlobalSearchResult[] {
  const q = params.query.trim().toLowerCase();
  if (!q) return [];

  const results: GlobalSearchResult[] = [];

  for (const unit of params.units) {
    if (
      unit.title.toLowerCase().includes(q) ||
      unit.overview.toLowerCase().includes(q)
    ) {
      results.push({
        id: `unit-${unit.unitNumber}`,
        type: 'unit',
        title: `Unit ${unit.unitNumber}: ${unit.title}`,
        snippet: unit.overview.slice(0, 140),
        unitNumber: unit.unitNumber,
        targetSection: 'syllabus',
      });
    }

    for (const topic of unit.topics) {
      if (
        topic.title.toLowerCase().includes(q) ||
        topic.description.toLowerCase().includes(q) ||
        topic.smartStudy?.detailedNotes?.toLowerCase().includes(q)
      ) {
        results.push({
          id: `topic-${topic.id}`,
          type: 'topic',
          title: topic.title,
          snippet: topic.description.slice(0, 140),
          unitNumber: unit.unitNumber,
          topicId: topic.id,
          targetSection: 'syllabus',
        });
      }

      for (const def of topic.definitions) {
        if (
          def.term.toLowerCase().includes(q) ||
          def.definition.toLowerCase().includes(q)
        ) {
          results.push({
            id: `def-${topic.id}-${def.term}`,
            type: 'definition',
            title: def.term,
            snippet: def.definition.slice(0, 140),
            unitNumber: unit.unitNumber,
            topicId: topic.id,
            targetSection: 'syllabus',
          });
        }
      }

      for (const formula of topic.formulas) {
        if (formula.toLowerCase().includes(q)) {
          results.push({
            id: `formula-${topic.id}-${formula.slice(0, 20)}`,
            type: 'formula',
            title: `Formula · ${topic.title}`,
            snippet: formula,
            unitNumber: unit.unitNumber,
            topicId: topic.id,
            targetSection: 'syllabus',
          });
        }
      }
    }
  }

  for (const doc of params.documents) {
    for (const page of doc.pages) {
      const idx = page.text.toLowerCase().indexOf(q);
      if (idx !== -1) {
        const start = Math.max(0, idx - 50);
        const end = Math.min(page.text.length, idx + 110);
        results.push({
          id: `doc-${doc.id}-p${page.pageNumber}`,
          type: 'note',
          title: `${doc.name} · Page ${page.pageNumber}`,
          snippet: `...${page.text.slice(start, end).trim()}...`,
          docId: doc.id,
          pageNumber: page.pageNumber,
          targetSection: 'materials',
        });
        break; // One best page match per doc in global quick search
      }
    }
  }

  for (const question of params.importantQuestions) {
    if (
      question.question.toLowerCase().includes(q) ||
      question.answer.toLowerCase().includes(q)
    ) {
      results.push({
        id: `iq-${question.id}`,
        type: 'question',
        title: `${question.marks}-Mark · ${question.topicTitle}`,
        snippet: question.question.slice(0, 140),
        unitNumber: question.unitNumber,
        targetSection: 'questions',
      });
    }
  }

  for (const card of params.flashcards) {
    if (
      card.front.toLowerCase().includes(q) ||
      card.back.toLowerCase().includes(q)
    ) {
      results.push({
        id: `fc-${card.id}`,
        type: 'flashcard',
        title: `Flashcard · ${card.topicTitle}`,
        snippet: card.front.slice(0, 140),
        unitNumber: card.unitNumber,
        targetSection: 'flashcards',
      });
    }
  }

  return results.slice(0, 25);
}

export function createActivity(
  type: ActivityItem['type'],
  title: string,
  subtitle: string,
  unitNumber?: number
): ActivityItem {
  return {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    title,
    subtitle,
    timestamp: new Date().toISOString(),
    unitNumber,
  };
}

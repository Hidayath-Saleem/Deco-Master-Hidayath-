import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import type { Request, Response } from 'express';
import {
  createEmptyWorkspace,
  createOfficialDriveWorkspace,
  deletePdfBinary,
  loadWorkspace,
  readPdfBinary,
  savePdfBinary,
  saveWorkspace,
} from './server/storage.ts';
import {
  downloadPublicDriveFile,
  listPublicDriveFolderRecursive,
  type PublicDriveItem,
} from './server/drivePublic.ts';
import { extractDocumentPages } from './server/pdfExtractor.ts';
import {
  embedTexts,
  extractSyllabusFromDocuments,
  generateFlashcardsFromNotes,
  generateImportantQuestionsForUnit,
  generateMcqsFromNotes,
  generateMockExamQuestions,
  generateSmartStudyForTopic,
  runRagTutorChat,
} from './server/geminiService.ts';
import { chunkDocumentPages, computeContentHash } from './src/utils/rag.ts';
import { createActivity } from './src/utils/progress.ts';
import {
  DEFAULT_DRIVE_FOLDER_ID,
  DEFAULT_DRIVE_FOLDER_URL,
  type ChatMessage,
  type MockExamConfig,
  type QuestionCategory,
  type StudyDocument,
  type WorkspaceState,
} from './src/types/deco.ts';

const app = express();
const PORT = Number(process.env.PORT || 3000);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 35 * 1024 * 1024 },
});

app.use(express.json({ limit: '20mb' }));

function getUserId(req: Request): string {
  const headerId = req.headers['x-user-id'];
  if (typeof headerId === 'string' && headerId.trim().length > 0) {
    return headerId.trim();
  }
  return 'guest';
}

function sanitizeWorkspaceForClient(state: WorkspaceState): WorkspaceState {
  return {
    ...state,
    // Strip heavy embedding vectors before sending state over HTTP; server retains embeddings in storage
    chunks: state.chunks.map((c) => ({
      id: c.id,
      docId: c.docId,
      docName: c.docName,
      pageNumber: c.pageNumber,
      chunkIndex: c.chunkIndex,
      text: c.text,
    })),
  };
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/workspace', async (req: Request, res: Response) => {
  try {
    const state = await loadWorkspace(getUserId(req));
    res.json(sanitizeWorkspaceForClient(state));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load workspace' });
  }
});

app.put('/api/workspace/state', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const current = await loadWorkspace(userId);
    const patch = req.body as Partial<WorkspaceState>;

    const next: WorkspaceState = {
      ...current,
      ...patch,
      // Preserve server-side chunks with embeddings unless explicitly cleared
      chunks: patch.chunks && patch.chunks.length === 0 ? [] : current.chunks,
      settings: {
        ...current.settings,
        ...(patch.settings ?? {}),
      },
    };
    await saveWorkspace(userId, next);
    res.json(sanitizeWorkspaceForClient(next));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to save workspace' });
  }
});

app.post('/api/workspace/reset', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { mode } = (req.body || {}) as { mode?: 'progress_only' | 'all' };
    const current = await loadWorkspace(userId);

    if (mode === 'all') {
      for (const doc of current.documents) {
        await deletePdfBinary(doc.id);
      }
      const empty = createEmptyWorkspace();
      empty.settings.theme = current.settings.theme;
      await saveWorkspace(userId, empty);
      res.json(sanitizeWorkspaceForClient(empty));
      return;
    }

    // Reset learning progress while keeping uploaded notes & extracted syllabus
    const resetUnits = current.units.map((u) => ({
      ...u,
      topics: u.topics.map((t) => ({
        ...t,
        status: 'not_started' as const,
        revisionCount: 0,
        lastStudiedAt: undefined,
      })),
    }));
    const resetFlashcards = current.flashcards.map((f) => ({
      ...f,
      difficulty: 'unrated' as const,
    }));

    const next: WorkspaceState = {
      ...current,
      units: resetUnits,
      flashcards: resetFlashcards,
      quizAttempts: [],
      mockAttempts: [],
      activities: [createActivity('study', 'Progress reset', 'All topic statuses, quiz attempts, and mock scores were cleared.')],
    };
    await saveWorkspace(userId, next);
    res.json(sanitizeWorkspaceForClient(next));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to reset workspace' });
  }
});

async function ingestDocumentBuffer(params: {
  userId: string;
  state: WorkspaceState;
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  source: 'upload' | 'drive';
  driveFileId?: string;
  unitHint?: number;
}): Promise<{ doc?: StudyDocument; duplicateOf?: string; skippedReason?: string }> {
  const pages = await extractDocumentPages(params.buffer, params.mimeType, params.fileName);
  const fullText = pages.map((p) => p.text).join('\n');

  if (!fullText.trim()) {
    return { skippedReason: `"${params.fileName}" contains no extractable text (it may be a scanned image-only PDF).` };
  }

  const contentHash = computeContentHash(fullText);
  const existingDup = params.state.documents.find(
    (d) => d.contentHash === contentHash || (params.driveFileId && d.driveFileId === params.driveFileId)
  );
  if (existingDup) {
    return { duplicateOf: existingDup.name };
  }

  const docId = `doc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const rawChunks = chunkDocumentPages(docId, params.fileName, pages);
  const embeddings = await embedTexts(rawChunks.map((c) => c.text));
  const chunksWithVec = rawChunks.map((c, idx) => ({
    ...c,
    embedding: embeddings[idx],
  }));

  const isPdf = params.mimeType === 'application/pdf' || params.fileName.toLowerCase().endsWith('.pdf');
  if (isPdf) {
    await savePdfBinary(docId, params.buffer);
  }

  const doc: StudyDocument = {
    id: docId,
    name: params.fileName,
    source: params.source,
    driveFileId: params.driveFileId,
    mimeType: params.mimeType || (isPdf ? 'application/pdf' : 'text/plain'),
    sizeBytes: params.buffer.length,
    pageCount: pages.length,
    chunkCount: chunksWithVec.length,
    indexed: true,
    hasBinaryPreview: isPdf,
    contentHash,
    ...(params.unitHint ? { unitHint: params.unitHint } : {}),
    uploadedAt: new Date().toISOString(),
    pages,
  };

  params.state.documents.push(doc);
  params.state.chunks.push(...chunksWithVec);
  params.state.activities.unshift(
    createActivity(
      params.source === 'drive' ? 'drive_sync' : 'upload',
      `${params.source === 'drive' ? 'Synced from Drive' : 'Uploaded'}: ${params.fileName}`,
      `Indexed ${pages.length} pages into ${chunksWithVec.length} retrieval chunks.`
    )
  );

  return { doc };
}

app.post('/api/documents/upload', upload.array('files', 12), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) {
      res.status(400).json({ error: 'No files provided.' });
      return;
    }

    const state = await loadWorkspace(userId);
    const added: StudyDocument[] = [];
    const duplicates: string[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const result = await ingestDocumentBuffer({
          userId,
          state,
          buffer: file.buffer,
          fileName: file.originalname,
          mimeType: file.mimetype,
          source: 'upload',
        });
        if (result.doc) added.push(result.doc);
        if (result.duplicateOf) duplicates.push(`${file.originalname} (matches "${result.duplicateOf}")`);
        if (result.skippedReason) errors.push(result.skippedReason);
      } catch (e) {
        errors.push(`${file.originalname}: ${e instanceof Error ? e.message : 'Extraction failed'}`);
      }
    }

    await saveWorkspace(userId, state);
    res.json({
      added,
      duplicates,
      errors,
      workspace: sanitizeWorkspaceForClient(state),
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Upload failed' });
  }
});

app.get('/api/drive/public-list', async (req: Request, res: Response) => {
  try {
    const folderId =
      typeof req.query.folderId === 'string' && req.query.folderId.trim()
        ? req.query.folderId.trim()
        : DEFAULT_DRIVE_FOLDER_ID;
    const files = await listPublicDriveFolderRecursive(folderId);
    res.json({ folderId, files });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Unable to list public Google Drive folder.',
    });
  }
});

app.post('/api/documents/import-public-drive', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { files, folderUrl, folderId } = (req.body || {}) as {
      files?: PublicDriveItem[];
      folderUrl?: string;
      folderId?: string;
    };

    if (!files || !files.length) {
      res.status(400).json({ error: 'No Drive files selected for import.' });
      return;
    }

    const state = await loadWorkspace(userId);
    if (folderUrl !== undefined) state.settings.driveFolderUrl = folderUrl;
    if (folderId !== undefined) state.settings.driveFolderId = folderId;

    const added: StudyDocument[] = [];
    const duplicates: string[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const downloaded = await downloadPublicDriveFile(file);
        const result = await ingestDocumentBuffer({
          userId,
          state,
          buffer: downloaded.buffer,
          fileName: downloaded.effectiveName,
          mimeType: downloaded.effectiveMime,
          source: 'drive',
          driveFileId: file.id,
          unitHint: file.unitHint,
        });
        if (result.doc) added.push(result.doc);
        if (result.duplicateOf) duplicates.push(`${file.name} (already synced as "${result.duplicateOf}")`);
        if (result.skippedReason) errors.push(result.skippedReason);
      } catch (e) {
        errors.push(`${file.name}: ${e instanceof Error ? e.message : 'Import failed'}`);
      }
    }

    state.lastSyncedAt = new Date().toISOString();
    await saveWorkspace(userId, state);
    res.json({
      added,
      duplicates,
      errors,
      workspace: sanitizeWorkspaceForClient(state),
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Public Drive import failed' });
  }
});

app.post('/api/documents/sync-official-drive', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const current = await loadWorkspace(userId);
    const seeded = createOfficialDriveWorkspace();

    const next: WorkspaceState = {
      ...seeded,
      quizAttempts: current.quizAttempts,
      mockAttempts: current.mockAttempts,
      importantQuestions: current.importantQuestions,
      mcqs: current.mcqs,
      flashcards: current.flashcards,
      chatHistory: current.chatHistory,
      settings: {
        ...current.settings,
        driveFolderUrl: DEFAULT_DRIVE_FOLDER_URL,
        driveFolderId: DEFAULT_DRIVE_FOLDER_ID,
      },
    };

    await saveWorkspace(userId, next);
    res.json(sanitizeWorkspaceForClient(next));
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to sync official DECO Drive syllabus.',
    });
  }
});

app.post('/api/documents/import-drive', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Google Drive access token is required.' });
      return;
    }
    const token = authHeader.slice('Bearer '.length).trim();

    const { files, folderUrl, folderId } = (req.body || {}) as {
      files?: { id: string; name: string; mimeType: string; unitHint?: number }[];
      folderUrl?: string;
      folderId?: string;
    };

    if (!files || !files.length) {
      res.status(400).json({ error: 'No Drive files selected for import.' });
      return;
    }

    const state = await loadWorkspace(userId);
    if (folderUrl !== undefined) state.settings.driveFolderUrl = folderUrl;
    if (folderId !== undefined) state.settings.driveFolderId = folderId;

    const added: StudyDocument[] = [];
    const duplicates: string[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const isGoogleDoc = file.mimeType === 'application/vnd.google-apps.document';
        const isGoogleSlides = file.mimeType === 'application/vnd.google-apps.presentation';
        const downloadUrl =
          isGoogleDoc || isGoogleSlides
            ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}/export?mimeType=application/pdf`
            : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`;

        const driveRes = await fetch(downloadUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!driveRes.ok) {
          errors.push(`${file.name}: Drive returned HTTP ${driveRes.status}`);
          continue;
        }
        const arrayBuf = await driveRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const effectiveMime = isGoogleDoc || isGoogleSlides ? 'application/pdf' : file.mimeType;
        const effectiveName =
          (isGoogleDoc || isGoogleSlides) && !file.name.toLowerCase().endsWith('.pdf')
            ? `${file.name}.pdf`
            : file.name;

        const result = await ingestDocumentBuffer({
          userId,
          state,
          buffer,
          fileName: effectiveName,
          mimeType: effectiveMime,
          source: 'drive',
          driveFileId: file.id,
          unitHint: file.unitHint,
        });
        if (result.doc) added.push(result.doc);
        if (result.duplicateOf) duplicates.push(`${file.name} (already synced as "${result.duplicateOf}")`);
        if (result.skippedReason) errors.push(result.skippedReason);
      } catch (e) {
        errors.push(`${file.name}: ${e instanceof Error ? e.message : 'Import failed'}`);
      }
    }

    state.lastSyncedAt = new Date().toISOString();
    await saveWorkspace(userId, state);
    res.json({
      added,
      duplicates,
      errors,
      workspace: sanitizeWorkspaceForClient(state),
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Drive import failed' });
  }
});

app.get('/api/documents/:id/preview', async (req: Request, res: Response) => {
  const docId = req.params.id;
  let pdfBuffer = await readPdfBinary(docId);

  if (!pdfBuffer) {
    const state = await loadWorkspace(getUserId(req));
    const doc = state.documents.find((d) => d.id === docId);
    if (doc?.driveFileId && doc.hasBinaryPreview) {
      try {
        const downloaded = await downloadPublicDriveFile({
          id: doc.driveFileId,
          name: doc.name,
          mimeType: doc.mimeType,
        });
        pdfBuffer = downloaded.buffer;
        await savePdfBinary(docId, pdfBuffer);
      } catch {
        // Fall through to 404 if Drive binary cannot be fetched publicly
      }
    }
  }

  if (!pdfBuffer) {
    res.status(404).json({ error: 'PDF binary preview not found.' });
    return;
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline');
  res.send(pdfBuffer);
});

app.delete('/api/documents/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const docId = req.params.id;
    const state = await loadWorkspace(userId);
    state.documents = state.documents.filter((d) => d.id !== docId);
    state.chunks = state.chunks.filter((c) => c.docId !== docId);
    await deletePdfBinary(docId);
    await saveWorkspace(userId, state);
    res.json(sanitizeWorkspaceForClient(state));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Delete failed' });
  }
});

app.post('/api/ai/extract-syllabus', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const state = await loadWorkspace(userId);
    if (!state.documents.length || !state.chunks.length) {
      res.status(400).json({ error: 'Please upload or sync at least one DECO notes document first.' });
      return;
    }

    const extractedUnits = await extractSyllabusFromDocuments(state.documents, state.chunks);
    state.units = extractedUnits;
    state.activities.unshift(
      createActivity(
        'study',
        '5-Unit DECO Syllabus Extracted',
        `Organized ${extractedUnits.reduce((s, u) => s + u.topics.length, 0)} topics across 5 units from ${state.documents.length} source document(s).`
      )
    );
    await saveWorkspace(userId, state);
    res.json(sanitizeWorkspaceForClient(state));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Syllabus extraction failed' });
  }
});

app.post('/api/ai/smart-study', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { unitNumber, topicId } = (req.body || {}) as { unitNumber: number; topicId: string };
    const state = await loadWorkspace(userId);

    const unit = state.units.find((u) => u.unitNumber === unitNumber);
    const topic = unit?.topics.find((t) => t.id === topicId);
    if (!unit || !topic) {
      res.status(404).json({ error: 'Topic not found in extracted syllabus.' });
      return;
    }

    const smartStudy = await generateSmartStudyForTopic(topic, unit.title, state.chunks);
    topic.smartStudy = smartStudy;
    topic.revisionCount = (topic.revisionCount || 0) + 1;
    topic.lastStudiedAt = new Date().toISOString();
    if (topic.status === 'not_started') {
      topic.status = 'in_progress';
    }

    state.activities.unshift(
      createActivity('study', `Studied: ${topic.title}`, `Generated Smart Study notes for Unit ${unit.unitNumber}.`, unit.unitNumber)
    );
    await saveWorkspace(userId, state);
    res.json({ smartStudy, workspace: sanitizeWorkspaceForClient(state) });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Smart Study generation failed' });
  }
});

app.post('/api/ai/tutor', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { question } = (req.body || {}) as { question: string };
    if (!question?.trim()) {
      res.status(400).json({ error: 'Question cannot be empty.' });
      return;
    }

    const state = await loadWorkspace(userId);
    const userMsg: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: question.trim(),
      timestamp: new Date().toISOString(),
    };

    const result = await runRagTutorChat({
      question: question.trim(),
      history: state.chatHistory,
      chunks: state.chunks,
      units: state.units,
      detailLevel: state.settings.tutorDetailLevel,
      preferCollegeNotesOnly: state.settings.preferCollegeNotesOnly,
    });

    const assistantMsg: ChatMessage = {
      id: `msg_a_${Date.now()}`,
      role: 'assistant',
      content: result.answer,
      citations: result.citations,
      usedSupplementaryKnowledge: result.usedSupplementaryKnowledge,
      timestamp: new Date().toISOString(),
    };

    state.chatHistory.push(userMsg, assistantMsg);
    if (state.chatHistory.length > 50) {
      state.chatHistory = state.chatHistory.slice(-50);
    }
    state.activities.unshift(
      createActivity('tutor', 'AI Tutor Session', question.trim().slice(0, 80))
    );
    await saveWorkspace(userId, state);

    res.json({
      reply: assistantMsg,
      workspace: sanitizeWorkspaceForClient(state),
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'AI Tutor failed' });
  }
});

app.post('/api/ai/generate-questions', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { unitNumber, category = 'all', count = 6 } = (req.body || {}) as {
      unitNumber: 1 | 2 | 3 | 4 | 5;
      category?: QuestionCategory | 'all';
      count?: number;
    };

    const state = await loadWorkspace(userId);
    const unit = state.units.find((u) => u.unitNumber === unitNumber);
    if (!unit || unit.topics.length === 0) {
      res.status(400).json({ error: `Unit ${unitNumber} has no extracted topics yet.` });
      return;
    }

    const generated = await generateImportantQuestionsForUnit({
      unit,
      category,
      count: Math.min(12, Math.max(2, count)),
      chunks: state.chunks,
    });

    state.importantQuestions = [...generated, ...state.importantQuestions];
    state.activities.unshift(
      createActivity('study', `Generated ${generated.length} Exam Questions`, `Unit ${unitNumber}: ${unit.title}`, unitNumber)
    );
    await saveWorkspace(userId, state);
    res.json({ questions: generated, workspace: sanitizeWorkspaceForClient(state) });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to generate questions' });
  }
});

app.post('/api/ai/generate-mcqs', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { unitNumber, topicTitle, count = 5 } = (req.body || {}) as {
      unitNumber?: 1 | 2 | 3 | 4 | 5;
      topicTitle?: string;
      count?: number;
    };
    const state = await loadWorkspace(userId);
    if (!state.units.some((u) => u.topics.length > 0)) {
      res.status(400).json({ error: 'Extract your 5-unit syllabus from uploaded notes first.' });
      return;
    }

    const mcqs = await generateMcqsFromNotes({
      units: state.units,
      unitNumber,
      topicTitle,
      count: Math.min(15, Math.max(3, count)),
      chunks: state.chunks,
    });

    state.mcqs = [...mcqs, ...state.mcqs].slice(0, 120);
    await saveWorkspace(userId, state);
    res.json({ mcqs, workspace: sanitizeWorkspaceForClient(state) });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to generate MCQs' });
  }
});

app.post('/api/ai/generate-flashcards', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { unitNumber, count = 8 } = (req.body || {}) as {
      unitNumber: 1 | 2 | 3 | 4 | 5;
      count?: number;
    };
    const state = await loadWorkspace(userId);
    const unit = state.units.find((u) => u.unitNumber === unitNumber);
    if (!unit || unit.topics.length === 0) {
      res.status(400).json({ error: `Unit ${unitNumber} has no extracted topics yet.` });
      return;
    }

    const cards = await generateFlashcardsFromNotes({
      unit,
      count: Math.min(16, Math.max(4, count)),
      chunks: state.chunks,
    });

    state.flashcards = [...cards, ...state.flashcards];
    state.activities.unshift(
      createActivity('flashcard', `Created ${cards.length} Flashcards`, `Unit ${unitNumber}: ${unit.title}`, unitNumber)
    );
    await saveWorkspace(userId, state);
    res.json({ flashcards: cards, workspace: sanitizeWorkspaceForClient(state) });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to generate flashcards' });
  }
});

app.post('/api/ai/generate-mock-exam', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const config = req.body as MockExamConfig;
    const state = await loadWorkspace(userId);
    if (!state.units.some((u) => u.topics.length > 0)) {
      res.status(400).json({ error: 'Extract your syllabus from uploaded notes before creating a mock exam.' });
      return;
    }

    const questions = await generateMockExamQuestions({
      config,
      units: state.units,
      chunks: state.chunks,
    });

    res.json({ questions });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to generate mock exam' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DECO Master server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

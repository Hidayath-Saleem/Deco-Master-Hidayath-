import type {
  ChatMessage,
  Flashcard,
  ImportantQuestion,
  MCQQuestion,
  MockExamConfig,
  MockExamQuestion,
  QuestionCategory,
  TopicSmartStudy,
  WorkspaceState,
} from '../types/deco';
import type { DriveFileItem } from './googleDriveAuth';

function buildHeaders(userId?: string, extra?: Record<string, string>): Record<string, string> {
  return {
    'x-user-id': userId || 'guest',
    ...(extra ?? {}),
  };
}

async function handleJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function fetchWorkspace(userId?: string): Promise<WorkspaceState> {
  const res = await fetch('/api/workspace', {
    headers: buildHeaders(userId),
  });
  return handleJson<WorkspaceState>(res);
}

export async function persistWorkspacePatch(
  userId: string | undefined,
  patch: Partial<WorkspaceState>
): Promise<WorkspaceState> {
  const res = await fetch('/api/workspace/state', {
    method: 'PUT',
    headers: buildHeaders(userId, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(patch),
  });
  return handleJson<WorkspaceState>(res);
}

export async function resetWorkspace(
  userId: string | undefined,
  mode: 'progress_only' | 'all'
): Promise<WorkspaceState> {
  const res = await fetch('/api/workspace/reset', {
    method: 'POST',
    headers: buildHeaders(userId, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ mode }),
  });
  return handleJson<WorkspaceState>(res);
}

export async function uploadPdfDocuments(
  userId: string | undefined,
  files: FileList | File[]
): Promise<{
  added: WorkspaceState['documents'];
  duplicates: string[];
  errors: string[];
  workspace: WorkspaceState;
}> {
  const form = new FormData();
  Array.from(files).forEach((f) => form.append('files', f));
  const res = await fetch('/api/documents/upload', {
    method: 'POST',
    headers: buildHeaders(userId),
    body: form,
  });
  return handleJson(res);
}

export async function importDriveDocuments(params: {
  userId?: string;
  accessToken: string;
  files: DriveFileItem[];
  folderUrl?: string;
  folderId?: string;
}): Promise<{
  added: WorkspaceState['documents'];
  duplicates: string[];
  errors: string[];
  workspace: WorkspaceState;
}> {
  const res = await fetch('/api/documents/import-drive', {
    method: 'POST',
    headers: buildHeaders(params.userId, {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.accessToken}`,
    }),
    body: JSON.stringify({
      files: params.files,
      folderUrl: params.folderUrl,
      folderId: params.folderId,
    }),
  });
  return handleJson(res);
}

export async function listPublicDriveFiles(folderId: string): Promise<{
  folderId: string;
  files: DriveFileItem[];
}> {
  const res = await fetch(
    `/api/drive/public-list?folderId=${encodeURIComponent(folderId)}`
  );
  return handleJson(res);
}

export async function importPublicDriveDocuments(params: {
  userId?: string;
  files: DriveFileItem[];
  folderUrl?: string;
  folderId?: string;
}): Promise<{
  added: WorkspaceState['documents'];
  duplicates: string[];
  errors: string[];
  workspace: WorkspaceState;
}> {
  const res = await fetch('/api/documents/import-public-drive', {
    method: 'POST',
    headers: buildHeaders(params.userId, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      files: params.files,
      folderUrl: params.folderUrl,
      folderId: params.folderId,
    }),
  });
  return handleJson(res);
}

export async function syncOfficialDriveSyllabus(userId?: string): Promise<WorkspaceState> {
  const res = await fetch('/api/documents/sync-official-drive', {
    method: 'POST',
    headers: buildHeaders(userId, { 'Content-Type': 'application/json' }),
  });
  return handleJson<WorkspaceState>(res);
}

export async function deleteDocument(userId: string | undefined, docId: string): Promise<WorkspaceState> {
  const res = await fetch(`/api/documents/${encodeURIComponent(docId)}`, {
    method: 'DELETE',
    headers: buildHeaders(userId),
  });
  return handleJson<WorkspaceState>(res);
}

export async function extractSyllabus(userId?: string): Promise<WorkspaceState> {
  const res = await fetch('/api/ai/extract-syllabus', {
    method: 'POST',
    headers: buildHeaders(userId, { 'Content-Type': 'application/json' }),
  });
  return handleJson<WorkspaceState>(res);
}

export async function generateSmartStudy(
  userId: string | undefined,
  unitNumber: number,
  topicId: string
): Promise<{ smartStudy: TopicSmartStudy; workspace: WorkspaceState }> {
  const res = await fetch('/api/ai/smart-study', {
    method: 'POST',
    headers: buildHeaders(userId, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ unitNumber, topicId }),
  });
  return handleJson(res);
}

export async function sendTutorQuestion(
  userId: string | undefined,
  question: string
): Promise<{ reply: ChatMessage; workspace: WorkspaceState }> {
  const res = await fetch('/api/ai/tutor', {
    method: 'POST',
    headers: buildHeaders(userId, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ question }),
  });
  return handleJson(res);
}

export async function generateImportantQuestions(
  userId: string | undefined,
  unitNumber: 1 | 2 | 3 | 4 | 5,
  category: QuestionCategory | 'all',
  count = 6
): Promise<{ questions: ImportantQuestion[]; workspace: WorkspaceState }> {
  const res = await fetch('/api/ai/generate-questions', {
    method: 'POST',
    headers: buildHeaders(userId, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ unitNumber, category, count }),
  });
  return handleJson(res);
}

export async function generateMcqs(
  userId: string | undefined,
  params: { unitNumber?: 1 | 2 | 3 | 4 | 5; topicTitle?: string; count?: number }
): Promise<{ mcqs: MCQQuestion[]; workspace: WorkspaceState }> {
  const res = await fetch('/api/ai/generate-mcqs', {
    method: 'POST',
    headers: buildHeaders(userId, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(params),
  });
  return handleJson(res);
}

export async function generateFlashcards(
  userId: string | undefined,
  unitNumber: 1 | 2 | 3 | 4 | 5,
  count = 8
): Promise<{ flashcards: Flashcard[]; workspace: WorkspaceState }> {
  const res = await fetch('/api/ai/generate-flashcards', {
    method: 'POST',
    headers: buildHeaders(userId, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ unitNumber, count }),
  });
  return handleJson(res);
}

export async function generateMockExam(
  userId: string | undefined,
  config: MockExamConfig
): Promise<{ questions: MockExamQuestion[] }> {
  const res = await fetch('/api/ai/generate-mock-exam', {
    method: 'POST',
    headers: buildHeaders(userId, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(config),
  });
  return handleJson(res);
}

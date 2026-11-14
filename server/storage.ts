import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_DRIVE_FOLDER_ID,
  DEFAULT_DRIVE_FOLDER_URL,
  type DocumentChunk,
  type StudyDocument,
  type WorkspaceState,
} from '../src/types/deco.ts';
import { createActivity } from '../src/utils/progress.ts';
import { buildOfficialDecoUnits } from './officialUnits.ts';

const DATA_ROOT = path.resolve(process.cwd(), '.deco-data');
const WORKSPACES_DIR = path.join(DATA_ROOT, 'workspaces');
const PDFS_DIR = path.join(DATA_ROOT, 'pdfs');
const SEED_PATH = path.resolve(process.cwd(), 'server', 'officialDriveSeed.json');

interface OfficialDriveSeed {
  documents: StudyDocument[];
  chunks: DocumentChunk[];
}

let cachedSeed: OfficialDriveSeed | null = null;

function loadOfficialDriveSeed(): OfficialDriveSeed {
  if (cachedSeed) return cachedSeed;
  try {
    if (fsSync.existsSync(SEED_PATH)) {
      const raw = fsSync.readFileSync(SEED_PATH, 'utf-8');
      cachedSeed = JSON.parse(raw) as OfficialDriveSeed;
      return cachedSeed;
    }
  } catch {
    // Fallback to empty if seed file unavailable
  }
  return { documents: [], chunks: [] };
}

export function createEmptyWorkspace(): WorkspaceState {
  return {
    documents: [],
    chunks: [],
    units: [],
    importantQuestions: [],
    mcqs: [],
    flashcards: [],
    quizAttempts: [],
    mockAttempts: [],
    activities: [],
    chatHistory: [],
    settings: {
      theme: 'dark',
      studentName: '',
      collegeName: '',
      driveFolderUrl: DEFAULT_DRIVE_FOLDER_URL,
      driveFolderId: DEFAULT_DRIVE_FOLDER_ID,
      tutorDetailLevel: 'balanced',
      preferCollegeNotesOnly: false,
    },
  };
}

export function createOfficialDriveWorkspace(): WorkspaceState {
  const base = createEmptyWorkspace();
  const seed = loadOfficialDriveSeed();
  const units = buildOfficialDecoUnits();

  if (seed.documents.length === 0) {
    return base;
  }

  return {
    ...base,
    documents: seed.documents.map((d) => ({ ...d })),
    chunks: seed.chunks.map((c) => ({ ...c })),
    units,
    lastSyncedAt: seed.documents[0]?.uploadedAt || new Date().toISOString(),
    activities: [
      createActivity(
        'drive_sync',
        'Official DECO Drive Syllabus Loaded',
        `Indexed ${seed.documents.length} source files and 5 units (27 topics) from linked Google Drive folder.`
      ),
    ],
  };
}

function sanitizeUserId(userId?: string): string {
  const raw = (userId || 'guest').trim();
  const safe = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  return safe || 'guest';
}

async function ensureDirs(): Promise<void> {
  await fs.mkdir(WORKSPACES_DIR, { recursive: true });
  await fs.mkdir(PDFS_DIR, { recursive: true });
}

export async function loadWorkspace(userId?: string): Promise<WorkspaceState> {
  await ensureDirs();
  const safeId = sanitizeUserId(userId);
  const filePath = path.join(WORKSPACES_DIR, `${safeId}.json`);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<WorkspaceState>;
    const base = createEmptyWorkspace();
    const loaded: WorkspaceState = {
      ...base,
      ...parsed,
      settings: {
        ...base.settings,
        ...(parsed.settings ?? {}),
        driveFolderUrl: parsed.settings?.driveFolderUrl || DEFAULT_DRIVE_FOLDER_URL,
        driveFolderId: parsed.settings?.driveFolderId || DEFAULT_DRIVE_FOLDER_ID,
      },
    };
    return loaded;
  } catch {
    // First-time workspace: seed directly from the user's official DECO Google Drive folder at 0% progress
    const initial = createOfficialDriveWorkspace();
    await fs.writeFile(filePath, JSON.stringify(initial), 'utf-8');
    return initial;
  }
}

export async function saveWorkspace(userId: string | undefined, state: WorkspaceState): Promise<void> {
  await ensureDirs();
  const safeId = sanitizeUserId(userId);
  const filePath = path.join(WORKSPACES_DIR, `${safeId}.json`);
  await fs.writeFile(filePath, JSON.stringify(state), 'utf-8');
}

export async function savePdfBinary(docId: string, buffer: Buffer): Promise<void> {
  await ensureDirs();
  const safeDocId = docId.replace(/[^a-zA-Z0-9_-]/g, '_');
  await fs.writeFile(path.join(PDFS_DIR, `${safeDocId}.pdf`), buffer);
}

export async function readPdfBinary(docId: string): Promise<Buffer | null> {
  await ensureDirs();
  const safeDocId = docId.replace(/[^a-zA-Z0-9_-]/g, '_');
  try {
    return await fs.readFile(path.join(PDFS_DIR, `${safeDocId}.pdf`));
  } catch {
    return null;
  }
}

export async function deletePdfBinary(docId: string): Promise<void> {
  const safeDocId = docId.replace(/[^a-zA-Z0-9_-]/g, '_');
  try {
    await fs.unlink(path.join(PDFS_DIR, `${safeDocId}.pdf`));
  } catch {
    // Ignore if file does not exist
  }
}

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, type User } from 'firebase/auth';
import {
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import type { StudyDocument, WorkspaceState } from '../types/deco';

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testFirestoreConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testFirestoreConnection();

function sanitizeSafeSegment(raw: string, maxLen = 120): string {
  return raw.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, maxLen) || 'file';
}

export async function uploadStudyFileToStorage(
  userId: string,
  docId: string,
  data: File | Blob,
  fileName: string
): Promise<{ storagePath: string; downloadUrl: string }> {
  const safeUid = sanitizeSafeSegment(userId, 128);
  const safeDocId = sanitizeSafeSegment(docId, 128);
  const safeName = sanitizeSafeSegment(fileName, 180);
  const storagePath = `users/${safeUid}/study-materials/${safeDocId}/${safeName}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, data, {
    contentType: data.type || 'application/octet-stream',
  });
  const downloadUrl = await getDownloadURL(storageRef);
  return { storagePath, downloadUrl };
}

export async function deleteStudyFileFromStorage(storagePath: string): Promise<void> {
  if (!storagePath) return;
  try {
    await deleteObject(ref(storage, storagePath));
  } catch (err) {
    // Ignore missing storage objects so document deletion can still finish
    const code = (err as { code?: string })?.code;
    if (code !== 'storage/object-not-found') {
      console.warn('Firebase Storage delete warning:', err);
    }
  }
}

export async function syncBackendDocToFirebaseStorage(
  user: User,
  docItem: StudyDocument
): Promise<{ storagePath: string; downloadUrl: string } | null> {
  if (!user.emailVerified) return null;
  try {
    let blob: Blob;
    if (docItem.hasBinaryPreview) {
      const res = await fetch(`/api/documents/${encodeURIComponent(docItem.id)}/preview`);
      if (!res.ok) return null;
      blob = await res.blob();
    } else {
      const fullText = docItem.pages.map((p) => `--- Page ${p.pageNumber} ---\n${p.text}`).join('\n\n');
      blob = new Blob([fullText], { type: 'text/plain' });
    }
    return await uploadStudyFileToStorage(user.uid, docItem.id, blob, docItem.name);
  } catch (err) {
    console.warn('Firebase Storage sync skipped:', err);
    return null;
  }
}

export async function ensureUserProfile(user: User): Promise<void> {
  if (!user.emailVerified || !user.email) return;
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email.slice(0, 254),
        ...(user.displayName ? { displayName: user.displayName.slice(0, 120) } : {}),
        ...(user.photoURL ? { photoURL: user.photoURL.slice(0, 500) } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        email: user.email.slice(0, 254),
        ...(user.displayName ? { displayName: user.displayName.slice(0, 120) } : {}),
        ...(user.photoURL ? { photoURL: user.photoURL.slice(0, 500) } : {}),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export async function saveDocumentMetaToFirestore(
  user: User,
  docMeta: StudyDocument
): Promise<void> {
  if (!user.emailVerified) return;
  await ensureUserProfile(user);
  const docPath = `users/${user.uid}/documents/${docMeta.id}`;
  const docRef = doc(db, 'users', user.uid, 'documents', docMeta.id);

  try {
    const existing = await getDoc(docRef);
    if (!existing.exists()) {
      await setDoc(docRef, {
        id: docMeta.id.slice(0, 128),
        ownerId: user.uid,
        name: docMeta.name.slice(0, 240),
        source: docMeta.source,
        ...(docMeta.driveFileId ? { driveFileId: docMeta.driveFileId.slice(0, 128) } : {}),
        mimeType: (docMeta.mimeType || 'application/pdf').slice(0, 160),
        sizeBytes: Math.min(50000000, Math.max(0, Number(docMeta.sizeBytes) || 0)),
        pageCount: Math.min(5000, Math.max(0, Number(docMeta.pageCount) || 0)),
        chunkCount: Math.min(20000, Math.max(0, Number(docMeta.chunkCount) || 0)),
        contentHash: docMeta.contentHash.slice(0, 128),
        ...(docMeta.unitHint ? { unitHint: Math.min(5, Math.max(1, docMeta.unitHint)) } : {}),
        ...(docMeta.storagePath ? { storagePath: docMeta.storagePath.slice(0, 400) } : {}),
        ...(docMeta.storageDownloadUrl
          ? { storageDownloadUrl: docMeta.storageDownloadUrl.slice(0, 1000) }
          : {}),
        uploadedAt: docMeta.uploadedAt.slice(0, 64),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(docRef, {
        ...(docMeta.unitHint ? { unitHint: Math.min(5, Math.max(1, docMeta.unitHint)) } : {}),
        ...(docMeta.storagePath ? { storagePath: docMeta.storagePath.slice(0, 400) } : {}),
        ...(docMeta.storageDownloadUrl
          ? { storageDownloadUrl: docMeta.storageDownloadUrl.slice(0, 1000) }
          : {}),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function deleteDocumentMetaFromFirestore(user: User, docId: string): Promise<void> {
  if (!user.emailVerified) return;
  const docPath = `users/${user.uid}/documents/${docId}`;
  try {
    await deleteDoc(doc(db, 'users', user.uid, 'documents', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

function buildCompactUnitsForFirestore(units: WorkspaceState['units']) {
  return units.slice(0, 5).map((u) => ({
    unitNumber: u.unitNumber,
    title: u.title.slice(0, 200),
    overview: u.overview.slice(0, 600),
    learningObjectives: u.learningObjectives.slice(0, 8),
    revisionSummary: u.revisionSummary.slice(0, 600),
    sourceDocs: u.sourceDocs.slice(0, 12),
    topics: u.topics.slice(0, 40).map((t) => ({
      id: t.id,
      unitNumber: t.unitNumber,
      title: t.title.slice(0, 180),
      description: t.description.slice(0, 400),
      status: t.status,
      sourceRefs: t.sourceRefs.slice(0, 4),
      revisionCount: t.revisionCount || 0,
      ...(t.lastStudiedAt ? { lastStudiedAt: t.lastStudiedAt } : {}),
    })),
  }));
}

export async function syncWorkspaceToFirestore(
  user: User,
  workspace: WorkspaceState
): Promise<void> {
  if (!user.emailVerified) return;
  await ensureUserProfile(user);
  const wsPath = `users/${user.uid}/workspace/main`;
  const wsRef = doc(db, 'users', user.uid, 'workspace', 'main');

  const safeSettings = {
    theme: workspace.settings.theme,
    studentName: (workspace.settings.studentName || '').slice(0, 120),
    collegeName: (workspace.settings.collegeName || '').slice(0, 160),
    driveFolderUrl: (workspace.settings.driveFolderUrl || '').slice(0, 500),
    driveFolderId: (workspace.settings.driveFolderId || '').slice(0, 128),
    tutorDetailLevel: workspace.settings.tutorDetailLevel,
    preferCollegeNotesOnly: Boolean(workspace.settings.preferCollegeNotesOnly),
  };

  const compactUnits = buildCompactUnitsForFirestore(workspace.units);
  const compactQuizzes = workspace.quizAttempts.slice(0, 100);
  const compactMocks = workspace.mockAttempts.slice(0, 50).map((m) => ({
    id: m.id,
    config: m.config,
    startedAt: m.startedAt,
    submittedAt: m.submittedAt,
    timeSpentSeconds: m.timeSpentSeconds,
    scoreObtained: m.scoreObtained,
    totalMarks: m.totalMarks,
    percentage: m.percentage,
    unitBreakdown: m.unitBreakdown,
    weakTopics: m.weakTopics,
  }));
  const compactActivities = workspace.activities.slice(0, 60);

  try {
    const snap = await getDoc(wsRef);
    if (!snap.exists()) {
      await setDoc(wsRef, {
        ownerId: user.uid,
        settings: safeSettings,
        units: compactUnits,
        quizAttempts: compactQuizzes,
        mockAttempts: compactMocks,
        activities: compactActivities,
        ...(workspace.lastSyncedAt ? { lastSyncedAt: workspace.lastSyncedAt.slice(0, 64) } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(wsRef, {
        settings: safeSettings,
        units: compactUnits,
        quizAttempts: compactQuizzes,
        mockAttempts: compactMocks,
        activities: compactActivities,
        ...(workspace.lastSyncedAt ? { lastSyncedAt: workspace.lastSyncedAt.slice(0, 64) } : {}),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, wsPath);
  }
}

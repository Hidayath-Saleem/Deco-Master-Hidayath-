import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from './firebaseClient';

export { auth };

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.readonly');

// Strictly in-memory token cache (never persisted in localStorage or sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export function initAuth(
  onUserChange: (user: User | null, accessToken: string | null) => void
) {
  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      cachedAccessToken = null;
      onUserChange(null, null);
      return;
    }
    if (!isSigningIn) {
      onUserChange(user, cachedAccessToken);
    }
  });
}

export async function signInWithGoogleDrive(): Promise<{ user: User; accessToken: string }> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google Drive access token was not returned. Please grant Drive permission.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
}

export function getCachedDriveToken(): string | null {
  return cachedAccessToken;
}

export async function signOutGoogle(): Promise<void> {
  cachedAccessToken = null;
  await signOut(auth);
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  folderPath?: string;
  unitHint?: number;
}

function inferUnitHintFromText(folderPath: string, fileName: string): number | undefined {
  const combined = `${folderPath} ${fileName}`;
  const match = combined.match(/(?:DECO_U|UNIT[-_\s]*|U)([1-5])\b/i);
  if (match) return Number(match[1]);
  return undefined;
}

const SUPPORTED_MIME_FILTER =
  "(mimeType='application/vnd.google-apps.folder' or mimeType='application/pdf' or mimeType='application/vnd.google-apps.document' or mimeType='application/vnd.google-apps.presentation' or mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mimeType='application/vnd.openxmlformats-officedocument.presentationml.presentation' or mimeType='text/plain')";

export async function listDriveFolderFiles(
  folderId: string | null,
  accessToken: string,
  depth = 0,
  folderPath = ''
): Promise<DriveFileItem[]> {
  if (depth > 3) return [];

  const query = folderId
    ? `'${folderId}' in parents and trashed=false and ${SUPPORTED_MIME_FILTER}`
    : `trashed=false and ${SUPPORTED_MIME_FILTER}`;

  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', query);
  url.searchParams.set('fields', 'files(id,name,mimeType,size,modifiedTime,webViewLink)');
  url.searchParams.set('pageSize', '100');
  url.searchParams.set('orderBy', 'name');
  url.searchParams.set('supportsAllDrives', 'true');
  url.searchParams.set('includeItemsFromAllDrives', 'true');

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const msg = errBody?.error?.message || `Google Drive API error (HTTP ${res.status})`;
    throw new Error(msg);
  }

  const data = (await res.json()) as { files?: DriveFileItem[] };
  const items = data.files ?? [];
  const results: DriveFileItem[] = [];

  for (const item of items) {
    if (item.name.startsWith('~$')) continue;
    if (item.mimeType === 'application/vnd.google-apps.folder') {
      if (folderId) {
        const subPath = folderPath ? `${folderPath}/${item.name}` : item.name;
        const children = await listDriveFolderFiles(item.id, accessToken, depth + 1, subPath);
        results.push(...children);
      }
      continue;
    }

    results.push({
      ...item,
      folderPath: folderPath || undefined,
      unitHint: inferUnitHintFromText(folderPath, item.name),
    });
  }

  return results;
}

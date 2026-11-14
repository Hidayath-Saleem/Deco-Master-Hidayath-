export interface PublicDriveItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  folderPath?: string;
  unitHint?: number;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function inferMimeFromName(name: string, href: string): string {
  const lower = name.toLowerCase();
  if (href.includes('/folders/')) return 'application/vnd.google-apps.folder';
  if (href.includes('/document/')) return 'application/vnd.google-apps.document';
  if (href.includes('/presentation/')) return 'application/vnd.google-apps.presentation';
  if (href.includes('/spreadsheets/')) return 'application/vnd.google-apps.spreadsheet';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (lower.endsWith('.pptx')) {
    return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  }
  if (lower.endsWith('.txt') || lower.endsWith('.md')) return 'text/plain';
  return 'application/octet-stream';
}

function inferUnitHint(folderPath: string, fileName: string): number | undefined {
  const combined = `${folderPath} ${fileName}`;
  const match = combined.match(/(?:DECO_U|UNIT[-_\s]*|U)([1-5])\b/i);
  if (match) return Number(match[1]);
  return undefined;
}

function isSupportedStudyFile(name: string, mimeType: string): boolean {
  if (name.startsWith('~$')) return false;
  const lower = name.toLowerCase();
  return (
    mimeType === 'application/pdf' ||
    mimeType === 'application/vnd.google-apps.document' ||
    mimeType === 'application/vnd.google-apps.presentation' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    mimeType === 'text/plain' ||
    lower.endsWith('.pdf') ||
    lower.endsWith('.docx') ||
    lower.endsWith('.pptx') ||
    lower.endsWith('.txt') ||
    lower.endsWith('.md')
  );
}

/**
 * Recursively crawls a publicly shared Google Drive folder (including unit subfolders)
 * without requiring OAuth credentials.
 */
export async function listPublicDriveFolderRecursive(
  folderId: string,
  depth = 0,
  folderPath = '',
  visited = new Set<string>()
): Promise<PublicDriveItem[]> {
  if (depth > 3 || !folderId || visited.has(folderId)) return [];
  visited.add(folderId);

  const url = `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}#list`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Unable to read public Google Drive folder (HTTP ${res.status}).`);
  }

  const html = await res.text();
  if (html.includes('accounts.google.com/ServiceLogin') && !html.includes('flip-entry-title')) {
    throw new Error('This Google Drive folder is private. Please sign in with Google Drive OAuth.');
  }

  const entryRegex =
    /id="entry-([^"]+)"[\s\S]*?<a href="([^"]+)"[\s\S]*?flip-entry-title">([^<]+)<\/div>/g;

  const folders: { id: string; name: string }[] = [];
  const files: PublicDriveItem[] = [];

  let match: RegExpExecArray | null;
  while ((match = entryRegex.exec(html)) !== null) {
    const id = match[1].trim();
    const href = match[2].split('?')[0].trim();
    const name = decodeHtmlEntities(match[3].trim());
    const mimeType = inferMimeFromName(name, href);

    if (mimeType === 'application/vnd.google-apps.folder') {
      folders.push({ id, name });
      continue;
    }

    if (isSupportedStudyFile(name, mimeType)) {
      files.push({
        id,
        name,
        mimeType,
        webViewLink: href,
        folderPath: folderPath || undefined,
        unitHint: inferUnitHint(folderPath, name),
      });
    }
  }

  for (const sub of folders) {
    const nextPath = folderPath ? `${folderPath}/${sub.name}` : sub.name;
    const nested = await listPublicDriveFolderRecursive(sub.id, depth + 1, nextPath, visited);
    files.push(...nested);
  }

  return files;
}

export async function downloadPublicDriveFile(item: {
  id: string;
  name: string;
  mimeType: string;
}): Promise<{ buffer: Buffer; effectiveName: string; effectiveMime: string }> {
  const isGoogleDoc = item.mimeType === 'application/vnd.google-apps.document';
  const isGoogleSlides = item.mimeType === 'application/vnd.google-apps.presentation';

  const downloadUrl =
    isGoogleDoc || isGoogleSlides
      ? `https://docs.google.com/${isGoogleDoc ? 'document' : 'presentation'}/d/${encodeURIComponent(item.id)}/export?format=pdf`
      : `https://drive.google.com/uc?export=download&id=${encodeURIComponent(item.id)}`;

  const res = await fetch(downloadUrl);
  if (!res.ok) {
    throw new Error(`Failed to download "${item.name}" from Google Drive (HTTP ${res.status}).`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Guard against Drive returning an HTML login/virus-scan wrapper instead of binary
  const head = buffer.slice(0, 200).toString('utf-8').toLowerCase();
  if (head.includes('<!doctype html') || head.includes('<html')) {
    throw new Error(`"${item.name}" could not be downloaded directly without Google OAuth.`);
  }

  const effectiveMime = isGoogleDoc || isGoogleSlides ? 'application/pdf' : item.mimeType;
  const effectiveName =
    (isGoogleDoc || isGoogleSlides) && !item.name.toLowerCase().endsWith('.pdf')
      ? `${item.name}.pdf`
      : item.name;

  return { buffer, effectiveName, effectiveMime };
}

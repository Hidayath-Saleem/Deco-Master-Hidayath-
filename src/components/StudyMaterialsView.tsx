import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  Download,
  ExternalLink,
  Eye,
  FileText,
  FolderSync,
  HardDrive,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  DEFAULT_DRIVE_FOLDER_URL,
  type StudyDocument,
  type WorkspaceState,
} from '../types/deco';
import { extractDriveFolderId } from '../utils/rag';
import type { DriveFileItem } from '../services/googleDriveAuth';
import { GoogleSignInButton } from './GoogleSignInButton';

interface StudyMaterialsViewProps {
  workspace: WorkspaceState;
  user: User | null;
  driveAccessToken: string | null;
  signingIn: boolean;
  onGoogleSignIn: () => void;
  onSaveDriveFolder: (url: string, folderId: string) => void;
  onListDriveFiles: (folderId: string | null) => Promise<DriveFileItem[]>;
  onUploadFiles: (files: FileList | File[]) => Promise<{
    added: StudyDocument[];
    duplicates: string[];
    errors: string[];
  }>;
  onImportDriveFiles: (files: DriveFileItem[], folderUrl: string, folderId: string) => Promise<{
    added: StudyDocument[];
    duplicates: string[];
    errors: string[];
  }>;
  onSyncOfficialDrive: () => Promise<void>;
  onSyncDocToStorage: (doc: StudyDocument) => Promise<void>;
  onDeleteDocument: (docId: string) => Promise<void>;
  onAssignUnitHint: (docId: string, unitHint: number | undefined) => Promise<void>;
  onExtractSyllabus: () => Promise<void>;
  extractingSyllabus: boolean;
}

export const StudyMaterialsView: React.FC<StudyMaterialsViewProps> = ({
  workspace,
  user,
  driveAccessToken,
  signingIn,
  onGoogleSignIn,
  onSaveDriveFolder,
  onListDriveFiles,
  onUploadFiles,
  onImportDriveFiles,
  onSyncOfficialDrive,
  onSyncDocToStorage,
  onDeleteDocument,
  onAssignUnitHint,
  onExtractSyllabus,
  extractingSyllabus,
}) => {
  const [folderInput, setFolderInput] = useState(
    workspace.settings.driveFolderUrl || DEFAULT_DRIVE_FOLDER_URL
  );
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [selectedDriveIds, setSelectedDriveIds] = useState<Set<string>>(new Set());
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [importingDrive, setImportingDrive] = useState(false);
  const [syncingOfficial, setSyncingOfficial] = useState(false);
  const [syncingDocId, setSyncingDocId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [banner, setBanner] = useState<{ type: 'info' | 'warn' | 'error'; text: string } | null>(null);

  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState<'all' | number>('all');
  const [previewDoc, setPreviewDoc] = useState<StudyDocument | null>(null);
  const [previewMode, setPreviewMode] = useState<'pdf' | 'text'>('pdf');
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<StudyDocument | null>(null);

  useEffect(() => {
    if (workspace.settings.driveFolderUrl) {
      setFolderInput(workspace.settings.driveFolderUrl);
    }
  }, [workspace.settings.driveFolderUrl]);

  const handleBrowseDrive = async () => {
    setBanner(null);
    const folderId = extractDriveFolderId(folderInput);
    if (folderInput.trim() && !folderId) {
      setBanner({
        type: 'error',
        text: 'Could not recognize a valid Google Drive folder URL or ID. Paste a link like https://drive.google.com/drive/folders/...',
      });
      return;
    }

    setLoadingDrive(true);
    try {
      onSaveDriveFolder(folderInput.trim(), folderId || '');
      const files = await onListDriveFiles(folderId);
      setDriveFiles(files);
      setSelectedDriveIds(new Set(files.map((f) => f.id)));
      if (files.length === 0) {
        setBanner({
          type: 'info',
          text: folderId
            ? 'No supported PDF, DOCX, PPTX, Google Docs, or text files were found in that Drive folder. You can also upload files manually on the right.'
            : 'No supported files found in your Drive root. Paste a specific folder link or upload files manually.',
        });
      }
    } catch (err) {
      setBanner({
        type: 'error',
        text: `${err instanceof Error ? err.message : 'Unable to browse Drive.'} If this folder is private, sign in with Google above or upload files directly.`,
      });
    } finally {
      setLoadingDrive(false);
    }
  };

  const handleImportSelected = async () => {
    const chosen = driveFiles.filter((f) => selectedDriveIds.has(f.id));
    if (chosen.length === 0) return;

    setImportingDrive(true);
    setBanner(null);
    try {
      const folderId = extractDriveFolderId(folderInput) || '';
      const result = await onImportDriveFiles(chosen, folderInput.trim(), folderId);
      const parts: string[] = [];
      if (result.added.length) parts.push(`Imported and indexed ${result.added.length} document(s).`);
      if (result.duplicates.length) parts.push(`Skipped duplicate(s): ${result.duplicates.join(', ')}.`);
      if (result.errors.length) parts.push(`Issues: ${result.errors.join(' | ')}`);
      setBanner({
        type: result.errors.length > 0 && result.added.length === 0 ? 'error' : 'info',
        text: parts.join(' '),
      });
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Drive import failed.',
      });
    } finally {
      setImportingDrive(false);
    }
  };

  const handleSyncOfficial = async () => {
    setSyncingOfficial(true);
    setBanner(null);
    try {
      await onSyncOfficialDrive();
      setBanner({
        type: 'info',
        text: 'Official U24EC304 5-Unit DECO Syllabus and Drive unit notes were loaded from your linked Google Drive folder.',
      });
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Official Drive syllabus sync failed.',
      });
    } finally {
      setSyncingOfficial(false);
    }
  };

  const handleFileInput = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setBanner(null);
    try {
      const result = await onUploadFiles(files);
      const parts: string[] = [];
      if (result.added.length) {
        parts.push(
          user?.emailVerified
            ? `Indexed ${result.added.length} file(s) and backed up to Firebase Storage.`
            : `Indexed ${result.added.length} file(s) for RAG retrieval.`
        );
      }
      if (result.duplicates.length) parts.push(`Duplicate skipped: ${result.duplicates.join(', ')}.`);
      if (result.errors.length) parts.push(`Errors: ${result.errors.join(' | ')}`);
      setBanner({
        type: result.errors.length > 0 && result.added.length === 0 ? 'error' : 'info',
        text: parts.join(' '),
      });
      if (result.added.length > 0 && !previewDoc) {
        setPreviewDoc(result.added[0]);
        setPreviewMode(result.added[0].hasBinaryPreview ? 'pdf' : 'text');
      }
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'File upload failed.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSyncDocStorage = async (docItem: StudyDocument) => {
    setSyncingDocId(docItem.id);
    setBanner(null);
    try {
      await onSyncDocToStorage(docItem);
      setBanner({
        type: 'info',
        text: `Backed up "${docItem.name}" to Firebase Storage.`,
      });
    } catch (err) {
      setBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Firebase Storage upload failed.',
      });
    } finally {
      setSyncingDocId(null);
    }
  };

  const filteredDocuments = useMemo(() => {
    return workspace.documents.filter((doc) => {
      if (unitFilter !== 'all' && doc.unitHint !== unitFilter) return false;
      if (!docSearchQuery.trim()) return true;
      const q = docSearchQuery.toLowerCase();
      return (
        doc.name.toLowerCase().includes(q) ||
        doc.pages.some((p) => p.text.toLowerCase().includes(q))
      );
    });
  }, [workspace.documents, unitFilter, docSearchQuery]);

  const inDocMatches = useMemo(() => {
    if (!docSearchQuery.trim()) return [];
    const q = docSearchQuery.toLowerCase();
    const matches: { doc: StudyDocument; pageNumber: number; excerpt: string }[] = [];
    for (const doc of filteredDocuments) {
      for (const page of doc.pages) {
        const idx = page.text.toLowerCase().indexOf(q);
        if (idx !== -1) {
          const start = Math.max(0, idx - 60);
          const end = Math.min(page.text.length, idx + 140);
          matches.push({
            doc,
            pageNumber: page.pageNumber,
            excerpt: page.text.slice(start, end),
          });
        }
      }
    }
    return matches.slice(0, 20);
  }, [filteredDocuments, docSearchQuery]);

  const storageSyncedCount = workspace.documents.filter((d) => Boolean(d.storageDownloadUrl)).length;

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {banner && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-3 ${
            banner.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
              : banner.type === 'warn'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
              : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-800 dark:text-cyan-200'
          }`}
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p className="flex-1">{banner.text}</p>
        </div>
      )}

      {/* Top Grid: Google Drive Sync + Manual PDF Upload & Firebase Storage */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Google Drive Notes Folder Card */}
        <section className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800/80 p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderSync className="h-5 w-5 text-indigo-500 shrink-0" />
                <span>Google Drive DECO Notes Folder</span>
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                Browse shared or authorized Google Drive folders recursively (including DECO_U1–U5 subfolders) and index PDFs, DOCX, and PPTX slides.
              </p>
            </div>
            <div className="shrink-0">
              {!user || !driveAccessToken ? (
                <GoogleSignInButton onClick={onGoogleSignIn} loading={signingIn} label="Connect Drive" />
              ) : (
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                  Drive Authorized
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="drive-folder-url" className="block text-xs font-medium text-slate-600 dark:text-slate-300">
              Google Drive Folder URL or Folder ID
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="drive-folder-url"
                type="url"
                value={folderInput}
                onChange={(e) => setFolderInput(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="flex-1 h-10 px-3 rounded-lg text-sm bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <button
                type="button"
                onClick={handleBrowseDrive}
                disabled={loadingDrive}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium whitespace-nowrap shrink-0 transition-colors"
              >
                {loadingDrive ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderSync className="h-4 w-4" />}
                {loadingDrive ? 'Listing...' : 'List Drive Files'}
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Works directly on shared folders or private folders when signed in with Google.
              </p>
              <button
                type="button"
                onClick={handleSyncOfficial}
                disabled={syncingOfficial}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-cyan-400 hover:underline whitespace-nowrap"
              >
                {syncingOfficial ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Sync Official DECO Drive Syllabus
              </button>
            </div>
          </div>

          {driveFiles.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{driveFiles.length} file(s) found in Drive</span>
                <button
                  type="button"
                  onClick={handleImportSelected}
                  disabled={importingDrive || selectedDriveIds.size === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium"
                >
                  {importingDrive && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Import Selected ({selectedDriveIds.size})
                </button>
              </div>
              <ul className="max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/70 rounded-lg border border-slate-200 dark:border-slate-800">
                {driveFiles.map((file) => {
                  const checked = selectedDriveIds.has(file.id);
                  return (
                    <li key={file.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <label className="flex items-center gap-2.5 min-w-0 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = new Set(selectedDriveIds);
                            if (checked) next.delete(file.id);
                            else next.add(file.id);
                            setSelectedDriveIds(next);
                          }}
                          className="rounded border-slate-300 dark:border-slate-700 text-indigo-600"
                        />
                        <div className="min-w-0">
                          <span className="block truncate text-slate-800 dark:text-slate-200">{file.name}</span>
                          {file.folderPath && (
                            <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {file.folderPath}
                              {file.unitHint ? ` · Unit ${file.unitHint}` : ''}
                            </span>
                          )}
                        </div>
                      </label>
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open ${file.name} in Google Drive`}
                          className="text-slate-400 hover:text-indigo-500 shrink-0"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        {/* Manual PDF Upload & Firebase Storage Card */}
        <section className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800/80 p-6 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="h-5 w-5 text-cyan-500" />
                Manual Upload &amp; Firebase Storage
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                Upload college DECO PDFs, DOCX, PPTX, or text notes. Signed-in accounts automatically back up files to Firebase Storage.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0">
              <HardDrive className={`h-3.5 w-3.5 ${user?.emailVerified ? 'text-emerald-500' : 'text-slate-400'}`} />
              {user?.emailVerified ? `Firebase Storage (${storageSyncedCount}/${workspace.documents.length})` : 'Local Index'}
            </span>
          </div>

          <label
            htmlFor="manual-pdf-upload"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFileInput(e.dataTransfer.files);
            }}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-cyan-400 bg-slate-50/70 dark:bg-[#0B1020]/70 px-6 py-8 text-center cursor-pointer transition-colors"
          >
            {uploading ? (
              <>
                <Loader2 className="h-7 w-7 text-indigo-500 animate-spin" />
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Extracting pages and indexing chunks...
                </p>
              </>
            ) : (
              <>
                <Upload className="h-7 w-7 text-indigo-500" />
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Click to choose PDF, DOCX, PPTX, or TXT files, or drag and drop
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Supports multi-file upload up to 35 MB per file with automatic duplicate detection
                </p>
              </>
            )}
            <input
              id="manual-pdf-upload"
              type="file"
              accept=".pdf,.docx,.pptx,.txt,.md,application/pdf,text/plain"
              multiple
              disabled={uploading}
              onChange={(e) => handleFileInput(e.target.files)}
              className="sr-only"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {workspace.documents.length} document(s) · {workspace.chunks.length} indexed chunks
            </span>
            <button
              type="button"
              onClick={onExtractSyllabus}
              disabled={workspace.documents.length === 0 || extractingSyllabus}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white text-sm font-medium transition-all whitespace-nowrap"
            >
              {extractingSyllabus ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {extractingSyllabus ? 'Extracting 5 Units...' : 'Extract 5-Unit Syllabus'}
            </button>
          </div>
        </section>
      </div>

      {/* Document Library + In-App Preview */}
      <section className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800/80 p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Indexed Study Materials
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                aria-label="Search inside documents"
                value={docSearchQuery}
                onChange={(e) => setDocSearchQuery(e.target.value)}
                placeholder="Search inside documents..."
                className="h-9 pl-9 pr-3 w-64 rounded-lg text-sm bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <select
              aria-label="Filter documents by unit"
              value={unitFilter}
              onChange={(e) =>
                setUnitFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="h-9 px-3 rounded-lg text-sm bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Units</option>
              <option value="1">Unit 1</option>
              <option value="2">Unit 2</option>
              <option value="3">Unit 3</option>
              <option value="4">Unit 4</option>
              <option value="5">Unit 5</option>
            </select>
          </div>
        </div>

        {/* In-document page search hits */}
        {docSearchQuery.trim() && (
          <div className="rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 p-4 space-y-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
              {inDocMatches.length} page match(es) for "{docSearchQuery}"
            </p>
            {inDocMatches.length > 0 && (
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {inDocMatches.map((m, idx) => (
                  <li key={`${m.doc.id}-${m.pageNumber}-${idx}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewDoc(m.doc);
                        setPreviewMode('text');
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <span className="text-xs font-semibold text-indigo-600 dark:text-cyan-400">
                        {m.doc.name} · Page {m.pageNumber}
                      </span>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                        ...{m.excerpt}...
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {workspace.documents.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <FileText className="h-10 w-10 text-slate-400 mx-auto" />
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              No DECO notes uploaded or synced yet
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Upload your unit PDFs or sync your linked Google Drive syllabus folder above. Every uploaded file is indexed page-by-page so the AI Tutor and Syllabus Extractor cite exact page numbers.
            </p>
            <button
              type="button"
              onClick={handleSyncOfficial}
              disabled={syncingOfficial}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
            >
              {syncingOfficial ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderSync className="h-3.5 w-3.5" />}
              Load Syllabus from Linked Google Drive
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Document List */}
            <div className={previewDoc ? 'lg:col-span-5 space-y-3' : 'lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-3'}>
              {filteredDocuments.map((doc) => {
                const isSelected = previewDoc?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0B1020]/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                          {doc.name}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          <span>{doc.source === 'drive' ? 'Google Drive' : 'Uploaded File'}</span>
                          <span aria-hidden="true">·</span>
                          <span>{doc.pageCount} pages</span>
                          <span aria-hidden="true">·</span>
                          <span>{doc.chunkCount} chunks</span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Indexed
                          </span>
                          {doc.storageDownloadUrl && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-medium">
                                <HardDrive className="h-3.5 w-3.5" />
                                Firebase Storage
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                      <select
                        aria-label={`Assign unit for ${doc.name}`}
                        value={doc.unitHint ?? ''}
                        onChange={(e) =>
                          onAssignUnitHint(
                            doc.id,
                            e.target.value ? Number(e.target.value) : undefined
                          )
                        }
                        className="h-8 px-2 rounded-md text-xs bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                      >
                        <option value="">Auto / All Units</option>
                        <option value="1">Unit 1</option>
                        <option value="2">Unit 2</option>
                        <option value="3">Unit 3</option>
                        <option value="4">Unit 4</option>
                        <option value="5">Unit 5</option>
                      </select>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewDoc(doc);
                            setPreviewMode(doc.hasBinaryPreview ? 'pdf' : 'text');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-500"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Preview
                        </button>

                        {user?.emailVerified && !doc.storageDownloadUrl && (
                          <button
                            type="button"
                            onClick={() => handleSyncDocStorage(doc)}
                            disabled={syncingDocId === doc.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-cyan-600 dark:text-cyan-400 hover:border-cyan-500"
                          >
                            {syncingDocId === doc.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CloudUpload className="h-3.5 w-3.5" />
                            )}
                            Save to Storage
                          </button>
                        )}

                        {(doc.storageDownloadUrl || doc.hasBinaryPreview) && (
                          <a
                            href={
                              doc.storageDownloadUrl ||
                              `/api/documents/${encodeURIComponent(doc.id)}/preview`
                            }
                            target={doc.storageDownloadUrl ? '_blank' : undefined}
                            rel={doc.storageDownloadUrl ? 'noreferrer' : undefined}
                            download={doc.storageDownloadUrl ? undefined : doc.name}
                            aria-label={`Download ${doc.name}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-500"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => setConfirmDeleteDoc(doc)}
                          aria-label={`Remove ${doc.name}`}
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* In-App PDF & Text Previewer */}
            {previewDoc && (
              <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1020] overflow-hidden flex flex-col min-h-[520px]">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#11182C]">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {previewDoc.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {previewDoc.pageCount} pages · {previewDoc.chunkCount} RAG chunks
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {previewDoc.hasBinaryPreview && (
                      <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                        <button
                          type="button"
                          onClick={() => setPreviewMode('pdf')}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                            previewMode === 'pdf'
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          PDF View
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewMode('text')}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                            previewMode === 'text'
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          Extracted Pages
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(null)}
                      className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    >
                      Close
                    </button>
                  </div>
                </div>

                {previewMode === 'pdf' && previewDoc.hasBinaryPreview ? (
                  <iframe
                    title={`PDF Preview of ${previewDoc.name}`}
                    src={
                      previewDoc.storageDownloadUrl ||
                      `/api/documents/${encodeURIComponent(previewDoc.id)}/preview`
                    }
                    className="w-full flex-1 min-h-[480px] bg-white"
                  />
                ) : (
                  <div className="p-4 space-y-4 max-h-[540px] overflow-y-auto">
                    {previewDoc.pages.map((page) => (
                      <div
                        key={page.pageNumber}
                        className="rounded-lg bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-4 space-y-1.5"
                      >
                        <p className="text-xs font-semibold text-indigo-600 dark:text-cyan-400 tabular-nums">
                          Page {page.pageNumber}
                        </p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {page.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Delete Confirmation Dialog */}
      {confirmDeleteDoc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-doc-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 id="delete-doc-title" className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Remove Study Material?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to remove <strong>{confirmDeleteDoc.name}</strong> and its {confirmDeleteDoc.chunkCount} indexed retrieval chunks?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteDoc(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = confirmDeleteDoc;
                  setConfirmDeleteDoc(null);
                  if (previewDoc?.id === target.id) setPreviewDoc(null);
                  await onDeleteDocument(target.id);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

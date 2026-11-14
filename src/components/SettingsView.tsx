import React, { useState } from 'react';
import {
  CheckCircle2,
  Download,
  FolderSync,
  Moon,
  RotateCcw,
  Sun,
  Trash2,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { NavSection, UserSettings, WorkspaceState } from '../types/deco';
import { extractDriveFolderId } from '../utils/rag';
import { GoogleSignInButton } from './GoogleSignInButton';

interface SettingsViewProps {
  workspace: WorkspaceState;
  user: User | null;
  driveConnected: boolean;
  signingIn: boolean;
  onGoogleSignIn: () => void;
  onSaveSettings: (settings: UserSettings) => Promise<void>;
  onResetWorkspace: (mode: 'progress_only' | 'all') => Promise<void>;
  onNavigate: (section: NavSection) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  workspace,
  user,
  driveConnected,
  signingIn,
  onGoogleSignIn,
  onSaveSettings,
  onResetWorkspace,
  onNavigate,
}) => {
  const [form, setForm] = useState<UserSettings>(workspace.settings);
  const [savedNotice, setSavedNotice] = useState(false);
  const [confirmMode, setConfirmMode] = useState<'progress_only' | 'all' | null>(null);

  React.useEffect(() => {
    setForm(workspace.settings);
  }, [workspace.settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const folderId = extractDriveFolderId(form.driveFolderUrl) || '';
    const updated: UserSettings = { ...form, driveFolderId: folderId };
    await onSaveSettings(updated);
    setForm(updated);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deco-master-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <form onSubmit={handleSave} className="space-y-6">
        {/* Theme & Profile */}
        <section className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Appearance &amp; Student Profile
          </h2>

          <div className="flex items-center justify-between gap-4 py-2">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Color Theme</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dark mode is default for long engineering study sessions.
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const next = { ...form, theme: 'dark' as const };
                  setForm(next);
                  onSaveSettings(next);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ${
                  form.theme === 'dark'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Moon className="h-3.5 w-3.5" />
                Dark
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = { ...form, theme: 'light' as const };
                  setForm(next);
                  onSaveSettings(next);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ${
                  form.theme === 'light'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Sun className="h-3.5 w-3.5" />
                Light
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label htmlFor="student-name" className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                Student Name
              </label>
              <input
                id="student-name"
                type="text"
                value={form.studentName}
                onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                placeholder="Your name"
                className="w-full h-10 px-3 rounded-lg text-sm bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="college-name" className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                College / University
              </label>
              <input
                id="college-name"
                type="text"
                value={form.collegeName}
                onChange={(e) => setForm({ ...form, collegeName: e.target.value })}
                placeholder="Engineering Department"
                className="w-full h-10 px-3 rounded-lg text-sm bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </section>

        {/* Google Drive, Cloud Firestore & Firebase Storage */}
        <section className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                Google Drive, Firestore &amp; Firebase Storage
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Drive:{' '}
                <strong className={driveConnected ? 'text-emerald-500' : 'text-cyan-500'}>
                  {driveConnected ? 'OAuth Authorized' : 'Shared Folder Ready'}
                </strong>
                {' · '}
                Firebase Storage &amp; Firestore:{' '}
                <strong className={user?.emailVerified ? 'text-emerald-500' : 'text-amber-500'}>
                  {user?.emailVerified ? 'Active (Signed In)' : 'Sign in with Google to Sync Cloud'}
                </strong>
                {workspace.lastSyncedAt &&
                  ` · Last synced ${new Date(workspace.lastSyncedAt).toLocaleString()}`}
              </p>
            </div>
            {!driveConnected && (
              <GoogleSignInButton onClick={onGoogleSignIn} loading={signingIn} label="Connect Google" />
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="settings-drive-url" className="block text-xs font-medium text-slate-600 dark:text-slate-300">
              Default DECO Notes Folder URL
            </label>
            <input
              id="settings-drive-url"
              type="url"
              value={form.driveFolderUrl}
              onChange={(e) => setForm({ ...form, driveFolderUrl: e.target.value })}
              placeholder="https://drive.google.com/drive/folders/..."
              className="w-full h-10 px-3 rounded-lg text-sm bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <button
            type="button"
            onClick={() => onNavigate('materials')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-100 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-indigo-500"
          >
            <FolderSync className="h-3.5 w-3.5" />
            Open Study Materials Sync
          </button>
        </section>

        {/* AI Tutor Preferences */}
        <section className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            AI Tutor Preferences
          </h2>

          <div className="space-y-1.5">
            <label htmlFor="ai-detail" className="block text-xs font-medium text-slate-600 dark:text-slate-300">
              Response Detail Level
            </label>
            <select
              id="ai-detail"
              value={form.tutorDetailLevel}
              onChange={(e) =>
                setForm({
                  ...form,
                  tutorDetailLevel: e.target.value as UserSettings['tutorDetailLevel'],
                })
              }
              className="w-full sm:w-64 h-10 px-3 rounded-lg text-sm bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="concise">Concise (Quick Answers)</option>
              <option value="balanced">Balanced (Default)</option>
              <option value="comprehensive">Comprehensive (Deep Exam Prep)</option>
            </select>
          </div>

          <label className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={form.preferCollegeNotesOnly}
              onChange={(e) => setForm({ ...form, preferCollegeNotesOnly: e.target.checked })}
              className="mt-1 rounded border-slate-300 dark:border-slate-700"
            />
            <span>
              Strictly restrict AI Tutor answers to uploaded college notes (do not add supplementary explanations when a topic is absent from notes)
            </span>
          </label>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"
            >
              Save Settings
            </button>
            {savedNotice && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-500">
                <CheckCircle2 className="h-4 w-4" />
                Settings saved
              </span>
            )}
          </div>
        </section>
      </form>

      {/* Data Management & Progress Reset */}
      <section className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          Data Management &amp; Reset
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-indigo-500"
          >
            <Download className="h-4 w-4" />
            Export Workspace JSON
          </button>

          <button
            type="button"
            onClick={() => setConfirmMode('progress_only')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Study Progress
          </button>

          <button
            type="button"
            onClick={() => setConfirmMode('all')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-500/15 hover:bg-red-500/25 text-red-600 dark:text-red-300 border border-red-500/30"
          >
            <Trash2 className="h-4 w-4" />
            Clear All Notes &amp; Data
          </button>
        </div>
      </section>

      {confirmMode && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              {confirmMode === 'progress_only' ? 'Reset Study Progress?' : 'Clear All Notes & Data?'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {confirmMode === 'progress_only'
                ? 'This resets all topic completion statuses, quiz scores, mock exam history, and flashcard ratings back to zero while keeping your uploaded PDFs and extracted syllabus.'
                : 'This permanently removes all uploaded PDFs, extracted syllabus units, generated questions, flashcards, chat history, and progress.'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmMode(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const m = confirmMode;
                  setConfirmMode(null);
                  await onResetWorkspace(m);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

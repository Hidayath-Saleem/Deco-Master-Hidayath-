import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './components/DashboardView';
import { SyllabusView } from './components/SyllabusView';
import { StudyMaterialsView } from './components/StudyMaterialsView';
import { AiTutorView } from './components/AiTutorView';
import { ImportantQuestionsView } from './components/ImportantQuestionsView';
import { PracticeTestsView } from './components/PracticeTestsView';
import { FlashcardsView } from './components/FlashcardsView';
import { MockExamsView } from './components/MockExamsView';
import { ProgressView } from './components/ProgressView';
import { SettingsView } from './components/SettingsView';
import {
  initAuth,
  listDriveFolderFiles,
  signInWithGoogleDrive,
  signOutGoogle,
  type DriveFileItem,
} from './services/googleDriveAuth';
import {
  deleteDocument,
  extractSyllabus,
  fetchWorkspace,
  generateFlashcards,
  generateImportantQuestions,
  generateMcqs,
  generateMockExam,
  generateSmartStudy,
  importDriveDocuments,
  importPublicDriveDocuments,
  listPublicDriveFiles,
  persistWorkspacePatch,
  resetWorkspace,
  sendTutorQuestion,
  syncOfficialDriveSyllabus,
  uploadPdfDocuments,
} from './services/api';
import {
  deleteDocumentMetaFromFirestore,
  deleteStudyFileFromStorage,
  saveDocumentMetaToFirestore,
  syncBackendDocToFirebaseStorage,
  syncWorkspaceToFirestore,
  uploadStudyFileToStorage,
} from './services/firebaseClient';
import { createActivity, searchWorkspace } from './utils/progress';
import {
  DEFAULT_DRIVE_FOLDER_ID,
  DEFAULT_DRIVE_FOLDER_URL,
  type FlashcardDifficulty,
  type GlobalSearchResult,
  type MockExamAttempt,
  type NavSection,
  type QuizAttempt,
  type StudyDocument,
  type TopicStatus,
  type UserSettings,
  type WorkspaceState,
} from './types/deco';

const INITIAL_WORKSPACE: WorkspaceState = {
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

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const [workspace, setWorkspace] = useState<WorkspaceState>(INITIAL_WORKSPACE);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [extractingSyllabus, setExtractingSyllabus] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [selectedUnit, setSelectedUnit] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync Firebase Auth state
  useEffect(() => {
    const unsubscribe = initAuth((authUser, token) => {
      setUser(authUser);
      setDriveToken(token);
    });
    return () => unsubscribe();
  }, []);

  // Load workspace for active user
  useEffect(() => {
    let active = true;
    setLoadingWorkspace(true);
    fetchWorkspace(user?.uid)
      .then((data) => {
        if (active) {
          setWorkspace(data);
          setGlobalError(null);
          if (user?.emailVerified) {
            void syncWorkspaceToFirestore(user, data).catch(() => {});
          }
        }
      })
      .catch((err) => {
        if (active) {
          setGlobalError(err instanceof Error ? err.message : 'Failed to load workspace.');
        }
      })
      .finally(() => {
        if (active) setLoadingWorkspace(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  // Apply Dark/Light theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (workspace.settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [workspace.settings.theme]);

  const searchResults = useMemo(
    () =>
      searchWorkspace({
        query: searchQuery,
        units: workspace.units,
        documents: workspace.documents,
        importantQuestions: workspace.importantQuestions,
        flashcards: workspace.flashcards,
      }),
    [searchQuery, workspace]
  );

  const syncFirestoreSafe = (nextState: WorkspaceState) => {
    if (user?.emailVerified) {
      void syncWorkspaceToFirestore(user, nextState).catch((err) => {
        console.warn('Firestore background sync warning:', err);
      });
    }
  };

  const attachFirebaseStorageToDocs = async (
    baseWorkspace: WorkspaceState,
    addedDocs: StudyDocument[],
    sourceFiles?: File[]
  ): Promise<WorkspaceState> => {
    if (!user?.emailVerified || addedDocs.length === 0) return baseWorkspace;

    const updatedDocsMap = new Map<string, StudyDocument>();
    for (const docItem of addedDocs) {
      try {
        const matchedFile = sourceFiles?.find((f) => f.name === docItem.name);
        const uploaded = matchedFile
          ? await uploadStudyFileToStorage(user.uid, docItem.id, matchedFile, docItem.name)
          : await syncBackendDocToFirebaseStorage(user, docItem);

        const enriched: StudyDocument = uploaded
          ? {
              ...docItem,
              storagePath: uploaded.storagePath,
              storageDownloadUrl: uploaded.downloadUrl,
            }
          : docItem;

        updatedDocsMap.set(docItem.id, enriched);
        await saveDocumentMetaToFirestore(user, enriched);
      } catch (err) {
        console.warn(`Firebase Storage sync warning for ${docItem.name}:`, err);
      }
    }

    if (updatedDocsMap.size === 0) return baseWorkspace;

    const mergedDocs = baseWorkspace.documents.map((d) => updatedDocsMap.get(d.id) ?? d);
    const persisted = await persistWorkspacePatch(user.uid, { documents: mergedDocs });
    syncFirestoreSafe(persisted);
    return persisted;
  };

  const handleSyncSingleDocToStorage = async (docItem: StudyDocument) => {
    if (!user?.emailVerified) {
      throw new Error('Sign in with Google to upload study materials to Firebase Storage.');
    }
    const uploaded = await syncBackendDocToFirebaseStorage(user, docItem);
    if (!uploaded) {
      throw new Error(`Could not upload "${docItem.name}" to Firebase Storage.`);
    }
    const enriched: StudyDocument = {
      ...docItem,
      storagePath: uploaded.storagePath,
      storageDownloadUrl: uploaded.downloadUrl,
    };
    const nextDocs = workspace.documents.map((d) => (d.id === docItem.id ? enriched : d));
    const saved = await persistWorkspacePatch(user.uid, { documents: nextDocs });
    setWorkspace(saved);
    await saveDocumentMetaToFirestore(user, enriched);
    syncFirestoreSafe(saved);
  };

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setGlobalError(null);
    try {
      const res = await signInWithGoogleDrive();
      setUser(res.user);
      setDriveToken(res.accessToken);
    } catch (err) {
      setGlobalError(
        err instanceof Error ? err.message : 'Google Sign-In was cancelled or failed.'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await signOutGoogle();
    setUser(null);
    setDriveToken(null);
  };

  const handleToggleTheme = async () => {
    const nextTheme = workspace.settings.theme === 'dark' ? 'light' : 'dark';
    const nextSettings: UserSettings = { ...workspace.settings, theme: nextTheme };
    setWorkspace((prev) => ({ ...prev, settings: nextSettings }));
    const saved = await persistWorkspacePatch(user?.uid, { settings: nextSettings });
    syncFirestoreSafe(saved);
  };

  const handleSelectSearchResult = (res: GlobalSearchResult) => {
    if (res.unitNumber && res.unitNumber >= 1 && res.unitNumber <= 5) {
      setSelectedUnit(res.unitNumber as 1 | 2 | 3 | 4 | 5);
    }
    if (res.topicId) {
      setSelectedTopicId(res.topicId);
    }
    setActiveSection(res.targetSection);
    setSearchQuery('');
  };

  const handleExtractSyllabus = async () => {
    setExtractingSyllabus(true);
    setGlobalError(null);
    try {
      const updated = await extractSyllabus(user?.uid);
      setWorkspace(updated);
      syncFirestoreSafe(updated);
      setActiveSection('syllabus');
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Syllabus extraction failed.');
    } finally {
      setExtractingSyllabus(false);
    }
  };

  const handleUpdateTopicStatus = async (
    unitNumber: 1 | 2 | 3 | 4 | 5,
    topicId: string,
    status: TopicStatus
  ) => {
    let targetTitle = '';
    const nextUnits = workspace.units.map((u) => {
      if (u.unitNumber !== unitNumber) return u;
      return {
        ...u,
        topics: u.topics.map((t) => {
          if (t.id !== topicId) return t;
          targetTitle = t.title;
          return {
            ...t,
            status,
            lastStudiedAt: new Date().toISOString(),
          };
        }),
      };
    });

    const nextActivities =
      status === 'completed'
        ? [
            createActivity(
              'study',
              `Completed Topic: ${targetTitle}`,
              `Unit ${unitNumber} progress updated.`,
              unitNumber
            ),
            ...workspace.activities,
          ]
        : workspace.activities;

    setWorkspace((prev) => ({ ...prev, units: nextUnits, activities: nextActivities }));
    const saved = await persistWorkspacePatch(user?.uid, {
      units: nextUnits,
      activities: nextActivities,
    });
    setWorkspace(saved);
    syncFirestoreSafe(saved);
  };

  const handleSaveQuizAttempt = async (attempt: QuizAttempt) => {
    const nextAttempts = [attempt, ...workspace.quizAttempts];
    const nextActivities = [
      createActivity(
        'quiz',
        `Practice Quiz: ${attempt.scorePercent}%`,
        `${attempt.correctCount}/${attempt.totalQuestions} correct`,
        attempt.unitNumber
      ),
      ...workspace.activities,
    ];
    const saved = await persistWorkspacePatch(user?.uid, {
      quizAttempts: nextAttempts,
      activities: nextActivities,
    });
    setWorkspace(saved);
    syncFirestoreSafe(saved);
  };

  const handleSaveMockAttempt = async (attempt: MockExamAttempt) => {
    const nextMocks = [attempt, ...workspace.mockAttempts];
    const nextActivities = [
      createActivity(
        'mock',
        `Mock Exam: ${attempt.percentage}%`,
        `${attempt.scoreObtained}/${attempt.totalMarks} marks`
      ),
      ...workspace.activities,
    ];
    const saved = await persistWorkspacePatch(user?.uid, {
      mockAttempts: nextMocks,
      activities: nextActivities,
    });
    setWorkspace(saved);
    syncFirestoreSafe(saved);
  };

  const handleToggleBookmark = async (questionId: string) => {
    const nextQuestions = workspace.importantQuestions.map((q) =>
      q.id === questionId ? { ...q, bookmarked: !q.bookmarked } : q
    );
    setWorkspace((prev) => ({ ...prev, importantQuestions: nextQuestions }));
    await persistWorkspacePatch(user?.uid, { importantQuestions: nextQuestions });
  };

  const handleRateFlashcard = async (cardId: string, difficulty: FlashcardDifficulty) => {
    const nextCards = workspace.flashcards.map((c) =>
      c.id === cardId ? { ...c, difficulty } : c
    );
    setWorkspace((prev) => ({ ...prev, flashcards: nextCards }));
    await persistWorkspacePatch(user?.uid, { flashcards: nextCards });
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0B1020] text-slate-900 dark:text-slate-100">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeSection={activeSection}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchResults={searchResults}
          onSelectSearchResult={handleSelectSearchResult}
          theme={workspace.settings.theme}
          onToggleTheme={handleToggleTheme}
          user={user}
          driveConnected={Boolean(driveToken)}
          onGoogleSignIn={handleGoogleSignIn}
          onGoogleSignOut={handleGoogleSignOut}
          signingIn={signingIn}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {globalError && (
            <div
              role="alert"
              className="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-600 dark:text-red-300 flex items-center justify-between gap-3"
            >
              <span>{globalError}</span>
              <button
                type="button"
                onClick={() => setGlobalError(null)}
                className="text-xs font-medium underline shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {loadingWorkspace ? (
            <div className="py-20 text-center text-sm text-slate-500 dark:text-slate-400">
              Loading your DECO Master workspace...
            </div>
          ) : (
            <>
              {activeSection === 'dashboard' && (
                <DashboardView
                  workspace={workspace}
                  userName={user?.displayName}
                  onNavigate={setActiveSection}
                  onOpenUnit={(unitNum) => {
                    setSelectedUnit(unitNum);
                    setActiveSection('syllabus');
                  }}
                  onOpenTopic={(unitNum, topicId) => {
                    setSelectedUnit(unitNum);
                    setSelectedTopicId(topicId);
                    setActiveSection('syllabus');
                  }}
                />
              )}

              {activeSection === 'syllabus' && (
                <SyllabusView
                  workspace={workspace}
                  selectedUnit={selectedUnit}
                  selectedTopicId={selectedTopicId}
                  onSelectUnit={setSelectedUnit}
                  onSelectTopic={setSelectedTopicId}
                  onUpdateTopicStatus={handleUpdateTopicStatus}
                  onGenerateSmartStudy={async (unitNum, topicId) => {
                    const res = await generateSmartStudy(user?.uid, unitNum, topicId);
                    setWorkspace(res.workspace);
                    syncFirestoreSafe(res.workspace);
                  }}
                  onExtractSyllabus={handleExtractSyllabus}
                  extractingSyllabus={extractingSyllabus}
                  onNavigate={setActiveSection}
                />
              )}

              {activeSection === 'materials' && (
                <StudyMaterialsView
                  workspace={workspace}
                  user={user}
                  driveAccessToken={driveToken}
                  signingIn={signingIn}
                  onGoogleSignIn={handleGoogleSignIn}
                  onSaveDriveFolder={async (url, folderId) => {
                    const nextSettings = {
                      ...workspace.settings,
                      driveFolderUrl: url,
                      driveFolderId: folderId,
                    };
                    setWorkspace((prev) => ({ ...prev, settings: nextSettings }));
                    const saved = await persistWorkspacePatch(user?.uid, { settings: nextSettings });
                    syncFirestoreSafe(saved);
                  }}
                  onListDriveFiles={async (folderId) => {
                    if (driveToken) {
                      return listDriveFolderFiles(folderId, driveToken);
                    }
                    if (!folderId) {
                      throw new Error('Paste a shared Google Drive folder URL or sign in with Google.');
                    }
                    const res = await listPublicDriveFiles(folderId);
                    return res.files;
                  }}
                  onUploadFiles={async (files) => {
                    const fileArray = Array.from(files);
                    const res = await uploadPdfDocuments(user?.uid, fileArray);
                    const syncedWorkspace = await attachFirebaseStorageToDocs(
                      res.workspace,
                      res.added,
                      fileArray
                    );
                    setWorkspace(syncedWorkspace);
                    return { ...res, workspace: syncedWorkspace };
                  }}
                  onImportDriveFiles={async (files: DriveFileItem[], folderUrl, folderId) => {
                    const res = driveToken
                      ? await importDriveDocuments({
                          userId: user?.uid,
                          accessToken: driveToken,
                          files,
                          folderUrl,
                          folderId,
                        })
                      : await importPublicDriveDocuments({
                          userId: user?.uid,
                          files,
                          folderUrl,
                          folderId,
                        });
                    const syncedWorkspace = await attachFirebaseStorageToDocs(res.workspace, res.added);
                    setWorkspace(syncedWorkspace);
                    return { ...res, workspace: syncedWorkspace };
                  }}
                  onSyncOfficialDrive={async () => {
                    const updated = await syncOfficialDriveSyllabus(user?.uid);
                    setWorkspace(updated);
                    syncFirestoreSafe(updated);
                  }}
                  onSyncDocToStorage={handleSyncSingleDocToStorage}
                  onDeleteDocument={async (docId) => {
                    const target = workspace.documents.find((d) => d.id === docId);
                    if (target?.storagePath) {
                      await deleteStudyFileFromStorage(target.storagePath);
                    }
                    if (user?.emailVerified) {
                      await deleteDocumentMetaFromFirestore(user, docId).catch(() => {});
                    }
                    const updated = await deleteDocument(user?.uid, docId);
                    setWorkspace(updated);
                    syncFirestoreSafe(updated);
                  }}
                  onAssignUnitHint={async (docId, unitHint) => {
                    const nextDocs = workspace.documents.map((d) =>
                      d.id === docId ? { ...d, unitHint } : d
                    );
                    const saved = await persistWorkspacePatch(user?.uid, { documents: nextDocs });
                    setWorkspace(saved);
                    const target = nextDocs.find((d) => d.id === docId);
                    if (target && user?.emailVerified) {
                      await saveDocumentMetaToFirestore(user, target).catch(() => {});
                    }
                  }}
                  onExtractSyllabus={handleExtractSyllabus}
                  extractingSyllabus={extractingSyllabus}
                />
              )}

              {activeSection === 'tutor' && (
                <AiTutorView
                  workspace={workspace}
                  onSendQuestion={async (question) => {
                    const res = await sendTutorQuestion(user?.uid, question);
                    setWorkspace(res.workspace);
                  }}
                  onClearHistory={async () => {
                    const saved = await persistWorkspacePatch(user?.uid, { chatHistory: [] });
                    setWorkspace(saved);
                  }}
                  onNavigate={setActiveSection}
                />
              )}

              {activeSection === 'questions' && (
                <ImportantQuestionsView
                  workspace={workspace}
                  onGenerateQuestions={async (unitNum, category, count) => {
                    const res = await generateImportantQuestions(user?.uid, unitNum, category, count);
                    setWorkspace(res.workspace);
                  }}
                  onToggleBookmark={handleToggleBookmark}
                  onNavigate={setActiveSection}
                />
              )}

              {activeSection === 'practice' && (
                <PracticeTestsView
                  workspace={workspace}
                  onGenerateMcqs={async (params) => {
                    const res = await generateMcqs(user?.uid, params);
                    setWorkspace(res.workspace);
                    return res.mcqs;
                  }}
                  onSaveQuizAttempt={handleSaveQuizAttempt}
                  onNavigate={setActiveSection}
                />
              )}

              {activeSection === 'flashcards' && (
                <FlashcardsView
                  workspace={workspace}
                  onGenerateFlashcards={async (unitNum, count) => {
                    const res = await generateFlashcards(user?.uid, unitNum, count);
                    setWorkspace(res.workspace);
                  }}
                  onRateFlashcard={handleRateFlashcard}
                  onNavigate={setActiveSection}
                />
              )}

              {activeSection === 'mock' && (
                <MockExamsView
                  workspace={workspace}
                  onGenerateMockExam={async (cfg) => {
                    const res = await generateMockExam(user?.uid, cfg);
                    return res.questions;
                  }}
                  onSaveMockAttempt={handleSaveMockAttempt}
                  onNavigate={setActiveSection}
                />
              )}

              {activeSection === 'progress' && <ProgressView workspace={workspace} />}

              {activeSection === 'settings' && (
                <SettingsView
                  workspace={workspace}
                  user={user}
                  driveConnected={Boolean(driveToken)}
                  signingIn={signingIn}
                  onGoogleSignIn={handleGoogleSignIn}
                  onSaveSettings={async (settings) => {
                    const saved = await persistWorkspacePatch(user?.uid, { settings });
                    setWorkspace(saved);
                    syncFirestoreSafe(saved);
                  }}
                  onResetWorkspace={async (mode) => {
                    if (mode === 'all') {
                      for (const docItem of workspace.documents) {
                        if (docItem.storagePath) {
                          await deleteStudyFileFromStorage(docItem.storagePath);
                        }
                        if (user?.emailVerified) {
                          await deleteDocumentMetaFromFirestore(user, docItem.id).catch(() => {});
                        }
                      }
                    }
                    const updated = await resetWorkspace(user?.uid, mode);
                    setWorkspace(updated);
                    syncFirestoreSafe(updated);
                  }}
                  onNavigate={setActiveSection}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export type TopicStatus = 'not_started' | 'in_progress' | 'completed';

export type QuestionCategory =
  | '2-mark'
  | '5-mark'
  | '10-mark'
  | 'repeated'
  | 'definition'
  | 'numerical'
  | 'diagram';

export type NavSection =
  | 'dashboard'
  | 'syllabus'
  | 'materials'
  | 'tutor'
  | 'questions'
  | 'practice'
  | 'flashcards'
  | 'mock'
  | 'progress'
  | 'settings';

export interface DocumentPage {
  pageNumber: number;
  text: string;
}

export const DEFAULT_DRIVE_FOLDER_ID = '1rxJWLRAwaXvAfBOgxR_HSkp6vcUTN5O6';
export const DEFAULT_DRIVE_FOLDER_URL =
  'https://drive.google.com/drive/folders/1rxJWLRAwaXvAfBOgxR_HSkp6vcUTN5O6?usp=drive_link';

export interface StudyDocument {
  id: string;
  name: string;
  source: 'drive' | 'upload';
  driveFileId?: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number;
  chunkCount: number;
  indexed: boolean;
  hasBinaryPreview: boolean;
  contentHash: string;
  unitHint?: number;
  storagePath?: string;
  storageDownloadUrl?: string;
  uploadedAt: string;
  pages: DocumentPage[];
}

export interface DocumentChunk {
  id: string;
  docId: string;
  docName: string;
  pageNumber: number;
  chunkIndex: number;
  text: string;
  embedding?: number[];
}

export interface SourceReference {
  docName: string;
  pageNumber: number;
  snippet?: string;
}

export interface TopicDefinition {
  term: string;
  definition: string;
  sourceRef?: string;
}

export interface TopicDiagram {
  title: string;
  diagramText: string;
  caption: string;
  sourceRef?: string;
}

export interface TopicWorkedExample {
  title: string;
  problem: string;
  solution: string;
  sourceRef?: string;
}

export interface TopicSmartStudy {
  easyExplanation: string;
  detailedNotes: string;
  examAnswers: {
    marks2: string;
    marks5: string;
    marks10: string;
  };
  quickRevision: {
    keyPoints: string[];
    definitions: TopicDefinition[];
    formulas: string[];
    facts: string[];
    memoryTricks: string[];
  };
  citations: SourceReference[];
  generatedAt: string;
}

export interface Topic {
  id: string;
  unitNumber: 1 | 2 | 3 | 4 | 5;
  title: string;
  description: string;
  status: TopicStatus;
  sourceRefs: SourceReference[];
  definitions: TopicDefinition[];
  formulas: string[];
  diagrams: TopicDiagram[];
  workedExamples: TopicWorkedExample[];
  smartStudy?: TopicSmartStudy;
  revisionCount: number;
  lastStudiedAt?: string;
}

export interface Unit {
  unitNumber: 1 | 2 | 3 | 4 | 5;
  title: string;
  overview: string;
  learningObjectives: string[];
  revisionSummary: string;
  topics: Topic[];
  sourceDocs: string[];
}

export interface ImportantQuestion {
  id: string;
  unitNumber: 1 | 2 | 3 | 4 | 5;
  topicId?: string;
  topicTitle: string;
  category: QuestionCategory;
  question: string;
  answer: string;
  diagram?: string;
  keywords: string[];
  marks: number;
  sourceRef: string;
  bookmarked: boolean;
}

export interface MCQQuestion {
  id: string;
  unitNumber: 1 | 2 | 3 | 4 | 5;
  topicId?: string;
  topicTitle: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  wrongOptionNotes?: string[];
  sourceRef: string;
}

export interface QuizAnswerRecord {
  questionId: string;
  topicTitle: string;
  unitNumber: number;
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
}

export interface QuizAttempt {
  id: string;
  mode: 'unit' | 'topic' | 'random' | 'custom' | 'full';
  unitNumber?: number;
  topicId?: string;
  totalQuestions: number;
  correctCount: number;
  scorePercent: number;
  timeTakenSeconds: number;
  weakTopics: string[];
  recommendedTopics: string[];
  createdAt: string;
  answers: QuizAnswerRecord[];
}

export type FlashcardDifficulty = 'unrated' | 'easy' | 'difficult';

export interface Flashcard {
  id: string;
  unitNumber: 1 | 2 | 3 | 4 | 5;
  topicId?: string;
  topicTitle: string;
  front: string;
  back: string;
  difficulty: FlashcardDifficulty;
  sourceRef: string;
}

export interface MockExamConfig {
  scope: 'unit' | 'full';
  unitNumber?: 1 | 2 | 3 | 4 | 5;
  durationMinutes: number;
  totalMarks: number;
  questionCount: number;
  categories: QuestionCategory[];
}

export interface MockExamQuestion {
  id: string;
  unitNumber: 1 | 2 | 3 | 4 | 5;
  topicTitle: string;
  category: QuestionCategory;
  marks: number;
  question: string;
  options?: [string, string, string, string];
  correctOptionIndex?: number;
  modelAnswer: string;
  keywords: string[];
  sourceRef: string;
}

export interface MockExamUserResponse {
  selectedOption?: number;
  textAnswer?: string;
  markedForReview?: boolean;
}

export interface MockExamAttempt {
  id: string;
  config: MockExamConfig;
  startedAt: string;
  submittedAt: string;
  timeSpentSeconds: number;
  scoreObtained: number;
  totalMarks: number;
  percentage: number;
  unitBreakdown: { unitNumber: number; obtained: number; total: number }[];
  weakTopics: string[];
  questions: MockExamQuestion[];
  userResponses: Record<string, MockExamUserResponse>;
}

export interface ActivityItem {
  id: string;
  type: 'upload' | 'drive_sync' | 'study' | 'quiz' | 'mock' | 'flashcard' | 'tutor';
  title: string;
  subtitle: string;
  timestamp: string;
  unitNumber?: number;
}

export interface ChatCitation {
  docName: string;
  pageNumber: number;
  excerpt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: ChatCitation[];
  usedSupplementaryKnowledge?: boolean;
  timestamp: string;
}

export interface UserSettings {
  theme: 'dark' | 'light';
  studentName: string;
  collegeName: string;
  driveFolderUrl: string;
  driveFolderId: string;
  tutorDetailLevel: 'concise' | 'balanced' | 'comprehensive';
  preferCollegeNotesOnly: boolean;
}

export interface WorkspaceState {
  documents: StudyDocument[];
  chunks: DocumentChunk[];
  units: Unit[];
  importantQuestions: ImportantQuestion[];
  mcqs: MCQQuestion[];
  flashcards: Flashcard[];
  quizAttempts: QuizAttempt[];
  mockAttempts: MockExamAttempt[];
  activities: ActivityItem[];
  chatHistory: ChatMessage[];
  settings: UserSettings;
  lastSyncedAt?: string;
}

export interface GlobalSearchResult {
  id: string;
  type: 'unit' | 'topic' | 'note' | 'question' | 'definition' | 'formula' | 'flashcard';
  title: string;
  snippet: string;
  unitNumber?: number;
  topicId?: string;
  docId?: string;
  pageNumber?: number;
  targetSection: NavSection;
}

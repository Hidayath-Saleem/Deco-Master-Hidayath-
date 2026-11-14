import React from 'react';
import {
  ArrowRight,
  BookOpen,
  Bot,
  Clock,
  FileUp,
  FolderSync,
  Sparkles,
} from 'lucide-react';
import type { NavSection, Topic, Unit, WorkspaceState } from '../types/deco';
import {
  calculateAnalyticsSummary,
  calculateOverallProgress,
  calculateUnitProgress,
} from '../utils/progress';

interface DashboardViewProps {
  workspace: WorkspaceState;
  userName?: string | null;
  onNavigate: (section: NavSection) => void;
  onOpenUnit: (unitNumber: 1 | 2 | 3 | 4 | 5) => void;
  onOpenTopic: (unitNumber: 1 | 2 | 3 | 4 | 5, topicId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  workspace,
  userName,
  onNavigate,
  onOpenUnit,
  onOpenTopic,
}) => {
  const overall = calculateOverallProgress(workspace.units);
  const analytics = calculateAnalyticsSummary(
    workspace.units,
    workspace.quizAttempts,
    workspace.mockAttempts
  );

  const displayName =
    workspace.settings.studentName.trim() || userName?.split(' ')[0] || 'Student';

  const hasNotes = workspace.documents.length > 0;
  const hasSyllabus = workspace.units.some((u) => u.topics.length > 0);

  // Determine Continue Learning topic (in-progress first, then first not_started)
  const allTopics: Topic[] = workspace.units.flatMap((u) => u.topics);
  const continueTopic =
    allTopics.find((t) => t.status === 'in_progress') ??
    allTopics.find((t) => t.status === 'not_started') ??
    null;

  const displayUnits: Unit[] = [1, 2, 3, 4, 5].map((num) => {
    const existing = workspace.units.find((u) => u.unitNumber === num);
    if (existing) return existing;
    return {
      unitNumber: num as 1 | 2 | 3 | 4 | 5,
      title: `Unit ${num}`,
      overview: hasNotes
        ? 'Run syllabus extraction in Study Materials or My Syllabus to populate this unit from your notes.'
        : 'Upload your DECO PDF notes or sync your Google Drive folder to populate Unit ' + num + '.',
      learningObjectives: [],
      revisionSummary: '',
      sourceDocs: [],
      topics: [],
    };
  });

  return (
    <div className="space-y-8">
      {/* Welcome Banner & Primary Action */}
      <section className="rounded-2xl bg-gradient-to-br from-indigo-600/12 via-blue-600/8 to-cyan-500/10 dark:from-[#131D3B] dark:via-[#11182F] dark:to-[#0F1B33] border border-indigo-500/20 dark:border-slate-800 p-6 lg:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-medium text-indigo-600 dark:text-cyan-400">
            Digital Electronics &amp; Computer Organization
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Welcome back, {displayName}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            {hasSyllabus
              ? `You have completed ${overall.completedTopics} of ${overall.totalTopics} extracted syllabus topics across ${workspace.documents.length} indexed source document${workspace.documents.length === 1 ? '' : 's'}.`
              : hasNotes
              ? 'Your college notes are indexed. Extract your 5-unit syllabus to unlock Smart Study Mode, MCQs, flashcards, and mock exams.'
              : 'Connect your Google Drive DECO folder or upload your college PDF notes to automatically organize all five units with zero fabricated content.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {!hasNotes ? (
            <button
              type="button"
              onClick={() => onNavigate('materials')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-sm transition-colors whitespace-nowrap"
            >
              <FileUp className="h-4 w-4" />
              Upload or Sync Notes
            </button>
          ) : !hasSyllabus ? (
            <button
              type="button"
              onClick={() => onNavigate('syllabus')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-sm transition-colors whitespace-nowrap"
            >
              <Sparkles className="h-4 w-4" />
              Extract 5-Unit Syllabus
            </button>
          ) : continueTopic ? (
            <button
              type="button"
              onClick={() => onOpenTopic(continueTopic.unitNumber, continueTopic.id)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-sm transition-colors whitespace-nowrap"
            >
              Continue Learning
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('mock')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-sm transition-colors whitespace-nowrap"
            >
              Take Full Mock Exam
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('tutor')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-medium transition-colors whitespace-nowrap"
          >
            <Bot className="h-4 w-4 text-cyan-500" />
            Ask AI Tutor
          </button>
        </div>
      </section>

      {/* Core Metrics Strip */}
      <section aria-label="Study Overview Metrics" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800/80 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Overall Syllabus Completion</p>
          <p className="mt-2 font-display text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
            {overall.percentage}%
          </p>
          <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${overall.percentage}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800/80 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Topics Completed</p>
          <p className="mt-2 font-display text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
            {overall.completedTopics}
            <span className="text-base font-normal text-slate-400 ml-1">/ {overall.totalTopics}</span>
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {overall.inProgressTopics} currently in progress
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800/80 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Practice Questions Attempted</p>
          <p className="mt-2 font-display text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
            {analytics.totalQuestionsAttempted}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            Across {workspace.quizAttempts.length} quiz session{workspace.quizAttempts.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800/80 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Average Quiz Score</p>
          <p className="mt-2 font-display text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
            {analytics.averageQuizScore}%
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {workspace.mockAttempts.length} mock exam{workspace.mockAttempts.length === 1 ? '' : 's'} completed
          </p>
        </div>
      </section>

      {/* Five Units Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Five-Unit DECO Syllabus
          </h3>
          <button
            type="button"
            onClick={() => onNavigate('syllabus')}
            className="text-xs font-medium text-indigo-600 dark:text-cyan-400 hover:underline whitespace-nowrap"
          >
            Open Full Syllabus
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayUnits.map((unit) => {
            const prog = calculateUnitProgress(unit);
            return (
              <div
                key={unit.unitNumber}
                className="rounded-xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800/80 p-5 flex flex-col justify-between gap-4 hover:border-indigo-500/40 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    <span className="font-semibold text-indigo-600 dark:text-cyan-400">
                      Unit {unit.unitNumber}
                    </span>
                    <span>
                      {prog.totalTopics} topic{prog.totalTopics === 1 ? '' : 's'} · {prog.percentage}%
                    </span>
                  </div>
                  <h4 className="font-display text-base font-semibold text-slate-900 dark:text-white line-clamp-1">
                    {unit.title}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {unit.overview}
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                      style={{ width: `${prog.percentage}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenUnit(unit.unitNumber)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 hover:bg-indigo-600 text-slate-800 hover:text-white dark:bg-slate-800/80 dark:hover:bg-indigo-600 dark:text-slate-100 transition-colors whitespace-nowrap"
                  >
                    <BookOpen className="h-4 w-4" />
                    Start Learning
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Continue Learning, Revision Suggestions & Recent Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Continue Learning */}
        <div className="rounded-xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800/80 p-5 space-y-4">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Continue Learning
          </h3>
          {continueTopic ? (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Unit {continueTopic.unitNumber} · {continueTopic.status === 'in_progress' ? 'In Progress' : 'Up Next'}
              </div>
              <p className="font-medium text-slate-900 dark:text-white">{continueTopic.title}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">
                {continueTopic.description}
              </p>
              <button
                type="button"
                onClick={() => onOpenTopic(continueTopic.unitNumber, continueTopic.id)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
              >
                Open Smart Study Mode
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
              <p>
                {hasSyllabus
                  ? 'All extracted topics are marked completed. Challenge yourself with a mock exam or difficult flashcards.'
                  : 'No active topic yet. Upload your DECO PDF notes or connect Google Drive to get started.'}
              </p>
              <button
                type="button"
                onClick={() => onNavigate(hasSyllabus ? 'mock' : 'materials')}
                className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-cyan-400 hover:underline"
              >
                <FolderSync className="h-4 w-4" />
                {hasSyllabus ? 'Configure Mock Exam' : 'Go to Study Materials'}
              </button>
            </div>
          )}
        </div>

        {/* Upcoming Revision Suggestions */}
        <div className="rounded-xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800/80 p-5 space-y-4">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Upcoming Revision Suggestions
          </h3>
          <ul className="space-y-3 text-sm">
            {analytics.recommendations.map((rec, idx) => (
              <li
                key={idx}
                className="pb-3 border-b last:border-b-0 last:pb-0 border-slate-100 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 leading-relaxed"
              >
                {rec}
              </li>
            ))}
          </ul>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800/80 p-5 space-y-4">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Recent Activity
          </h3>
          {workspace.activities.length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-400 py-4">
              No study activity recorded yet. Your uploads, topic completions, quizzes, and mock exams will appear here.
            </div>
          ) : (
            <ul className="space-y-3">
              {workspace.activities.slice(0, 5).map((act) => (
                <li
                  key={act.id}
                  className="flex items-start justify-between gap-3 pb-3 border-b last:border-b-0 last:pb-0 border-slate-100 dark:border-slate-800/80"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {act.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {act.subtitle}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 shrink-0 tabular-nums">
                    <Clock className="h-3 w-3" />
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
};

import React from 'react';
import { BarChart3 } from 'lucide-react';
import type { WorkspaceState } from '../types/deco';
import {
  calculateAnalyticsSummary,
  calculateOverallProgress,
  calculateUnitProgress,
} from '../utils/progress';

interface ProgressViewProps {
  workspace: WorkspaceState;
}

export const ProgressView: React.FC<ProgressViewProps> = ({ workspace }) => {
  const overall = calculateOverallProgress(workspace.units);
  const analytics = calculateAnalyticsSummary(
    workspace.units,
    workspace.quizAttempts,
    workspace.mockAttempts
  );

  const recentScores = [
    ...workspace.quizAttempts.map((q, i) => ({
      label: `Quiz ${i + 1}`,
      score: q.scorePercent,
      kind: 'Quiz',
      date: q.createdAt,
    })),
    ...workspace.mockAttempts.map((m, i) => ({
      label: `Mock ${i + 1}`,
      score: m.percentage,
      kind: 'Mock',
      date: m.submittedAt,
    })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-10);

  return (
    <div className="space-y-6">
      {/* Top KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Overall Syllabus Completion</p>
          <p className="mt-2 font-display text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
            {overall.percentage}%
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {overall.completedTopics} / {overall.totalTopics} topics completed
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Average Quiz Score</p>
          <p className="mt-2 font-display text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
            {analytics.averageQuizScore}%
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {workspace.quizAttempts.length} attempt(s)
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Average Mock Exam Score</p>
          <p className="mt-2 font-display text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
            {analytics.averageMockScore}%
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {workspace.mockAttempts.length} exam(s)
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Study Events Logged</p>
          <p className="mt-2 font-display text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
            {workspace.activities.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Persisted across sessions
          </p>
        </div>
      </div>

      {/* Unit-wise Completion + Assessment Score Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Unit-Wise Completion
          </h2>
          <div className="space-y-4">
            {([1, 2, 3, 4, 5] as const).map((num) => {
              const unit = workspace.units.find((u) => u.unitNumber === num);
              const prog = unit
                ? calculateUnitProgress(unit)
                : { totalTopics: 0, completedTopics: 0, percentage: 0 };
              return (
                <div key={num} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs tabular-nums">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      Unit {num}: {unit?.title || `Unit ${num}`}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 shrink-0 ml-2">
                      {prog.completedTopics}/{prog.totalTopics} ({prog.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
                      style={{ width: `${prog.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Quiz &amp; Mock Exam Scores Over Time
          </h2>
          {recentScores.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400 space-y-2">
              <BarChart3 className="h-8 w-8 mx-auto text-slate-400" />
              <p>Complete a Practice Test or Mock Exam to visualize your score trend.</p>
            </div>
          ) : (
            <div className="h-48 flex items-end gap-3 pt-6 pb-2 px-2">
              {recentScores.map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 tabular-nums">
                    {item.score}%
                  </span>
                  <div className="w-full max-w-[38px] h-32 rounded-t-lg bg-slate-100 dark:bg-slate-800/80 flex items-end overflow-hidden">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        item.kind === 'Mock' ? 'bg-cyan-500' : 'bg-indigo-500'
                      }`}
                      style={{ height: `${Math.max(4, item.score)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate w-full text-center">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Weakest Topics, Most Revised & Actionable Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-5 space-y-3">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Weakest Topics
          </h3>
          {analytics.weakTopics.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No weak topics flagged yet. Take unit quizzes to identify topics below 75% accuracy.
            </p>
          ) : (
            <ul className="space-y-2.5 text-sm">
              {analytics.weakTopics.map((wt) => (
                <li
                  key={wt.topicTitle}
                  className="flex items-center justify-between gap-2 pb-2 border-b last:border-b-0 border-slate-100 dark:border-slate-800"
                >
                  <span className="text-slate-800 dark:text-slate-200 truncate">
                    U{wt.unitNumber} · {wt.topicTitle}
                  </span>
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 tabular-nums shrink-0">
                    {wt.accuracyPercent}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-5 space-y-3">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Most Frequently Revised
          </h3>
          {analytics.mostRevisedTopics.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Study topics in Smart Study Mode to track revision frequency.
            </p>
          ) : (
            <ul className="space-y-2.5 text-sm">
              {analytics.mostRevisedTopics.map((rt) => (
                <li
                  key={rt.topicId}
                  className="flex items-center justify-between gap-2 pb-2 border-b last:border-b-0 border-slate-100 dark:border-slate-800"
                >
                  <span className="text-slate-800 dark:text-slate-200 truncate">
                    U{rt.unitNumber} · {rt.title}
                  </span>
                  <span className="text-xs font-medium text-indigo-600 dark:text-cyan-400 tabular-nums shrink-0">
                    {rt.revisionCount}x
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-5 space-y-3">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Actionable Recommendations
          </h3>
          <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
            {analytics.recommendations.map((rec, i) => (
              <li
                key={i}
                className="pb-2 border-b last:border-b-0 border-slate-100 dark:border-slate-800 leading-relaxed"
              >
                {rec}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};

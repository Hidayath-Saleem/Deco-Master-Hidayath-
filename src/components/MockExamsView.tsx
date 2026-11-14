import React, { useEffect, useState } from 'react';
import {
  ClipboardCheck,
  Clock,
  Flag,
  Loader2,
  Play,
  RotateCcw,
} from 'lucide-react';
import type {
  MockExamAttempt,
  MockExamConfig,
  MockExamQuestion,
  MockExamUserResponse,
  NavSection,
  QuestionCategory,
  WorkspaceState,
} from '../types/deco';
import { scoreMockExam } from '../utils/progress';

interface MockExamsViewProps {
  workspace: WorkspaceState;
  onGenerateMockExam: (config: MockExamConfig) => Promise<MockExamQuestion[]>;
  onSaveMockAttempt: (attempt: MockExamAttempt) => Promise<void>;
  onNavigate: (section: NavSection) => void;
}

const ALL_CATEGORIES: { id: QuestionCategory; label: string }[] = [
  { id: '2-mark', label: '2-Mark Short' },
  { id: '5-mark', label: '5-Mark Analytical' },
  { id: '10-mark', label: '10-Mark Essay' },
  { id: 'numerical', label: 'Numerical' },
  { id: 'diagram', label: 'Diagram-Based' },
];

export const MockExamsView: React.FC<MockExamsViewProps> = ({
  workspace,
  onGenerateMockExam,
  onSaveMockAttempt,
  onNavigate,
}) => {
  const [scope, setScope] = useState<'unit' | 'full'>('full');
  const [unitNumber, setUnitNumber] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [totalMarks, setTotalMarks] = useState(30);
  const [questionCount, setQuestionCount] = useState(6);
  const [categories, setCategories] = useState<QuestionCategory[]>(['2-mark', '5-mark', 'numerical']);
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [examQuestions, setExamQuestions] = useState<MockExamQuestion[]>([]);
  const [activeConfig, setActiveConfig] = useState<MockExamConfig | null>(null);
  const [responses, setResponses] = useState<Record<string, MockExamUserResponse>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState<string>('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submittedAttempt, setSubmittedAttempt] = useState<MockExamAttempt | null>(null);

  const hasSyllabus = workspace.units.some((u) => u.topics.length > 0);

  const handleSubmitExam = async () => {
    if (!activeConfig || examQuestions.length === 0 || submittedAttempt) return;
    setShowSubmitModal(false);
    const totalBudgetSeconds = activeConfig.durationMinutes * 60;
    const spent = Math.max(1, totalBudgetSeconds - remainingSeconds);
    const attempt = scoreMockExam({
      id: `mock_${Date.now().toString(36)}`,
      config: activeConfig,
      questions: examQuestions,
      userResponses: responses,
      startedAt,
      timeSpentSeconds: spent,
    });
    setSubmittedAttempt(attempt);
    await onSaveMockAttempt(attempt);
  };

  useEffect(() => {
    if (examQuestions.length === 0 || submittedAttempt) return;
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examQuestions.length, submittedAttempt]);

  const handleStartExam = async () => {
    if (categories.length === 0) {
      setErrorMsg('Select at least one question category.');
      return;
    }
    setGenerating(true);
    setErrorMsg(null);
    const cfg: MockExamConfig = {
      scope,
      unitNumber: scope === 'unit' ? unitNumber : undefined,
      durationMinutes,
      totalMarks,
      questionCount,
      categories,
    };
    try {
      const qs = await onGenerateMockExam(cfg);
      if (qs.length === 0) throw new Error('No exam questions generated.');
      setActiveConfig(cfg);
      setExamQuestions(qs);
      setResponses({});
      setCurrentIdx(0);
      setRemainingSeconds(durationMinutes * 60);
      setStartedAt(new Date().toISOString());
      setSubmittedAttempt(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create mock exam.');
    } finally {
      setGenerating(false);
    }
  };

  if (!hasSyllabus) {
    return (
      <div className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
        <ClipboardCheck className="h-10 w-10 text-indigo-500 mx-auto" />
        <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
          Syllabus Required for Mock Examinations
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
          Mock exam papers are assembled strictly from your extracted 5-unit DECO syllabus and uploaded college notes.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('materials')}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"
        >
          Go to Study Materials
        </button>
      </div>
    );
  }

  // Post-Submission Result Analysis
  if (submittedAttempt) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-indigo-600 dark:text-cyan-400">
                Mock Examination Result &amp; Analysis
              </p>
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
                {submittedAttempt.scoreObtained} / {submittedAttempt.totalMarks} Marks ({submittedAttempt.percentage}%)
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                setExamQuestions([]);
                setSubmittedAttempt(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"
            >
              <RotateCcw className="h-4 w-4" />
              Configure Another Exam
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Time Spent</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums mt-1">
                {Math.floor(submittedAttempt.timeSpentSeconds / 60)}m {submittedAttempt.timeSpentSeconds % 60}s
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Unit Breakdown</p>
              <div className="mt-1 space-y-1 text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                {submittedAttempt.unitBreakdown.map((u) => (
                  <p key={u.unitNumber}>
                    Unit {u.unitNumber}: {u.obtained}/{u.total} marks
                  </p>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Topics to Revise</p>
              <p className="text-sm text-slate-800 dark:text-slate-200 mt-1">
                {submittedAttempt.weakTopics.length > 0
                  ? submittedAttempt.weakTopics.join(', ')
                  : 'Strong performance across all tested topics'}
              </p>
            </div>
          </div>
        </div>

        {/* Question-by-Question Review */}
        <div className="space-y-4">
          {submittedAttempt.questions.map((q, idx) => {
            const resp = submittedAttempt.userResponses[q.id];
            return (
              <div
                key={q.id}
                className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-5 space-y-3"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  <span>
                    Q{idx + 1} · Unit {q.unitNumber} · {q.topicTitle} · {q.marks} Marks
                  </span>
                  <span>Source: {q.sourceRef}</span>
                </div>
                <p className="font-medium text-slate-900 dark:text-white">{q.question}</p>
                {q.options ? (
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Your choice:{' '}
                    <strong>
                      {typeof resp?.selectedOption === 'number'
                        ? q.options[resp.selectedOption]
                        : 'Unanswered'}
                    </strong>{' '}
                    | Correct:{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {typeof q.correctOptionIndex === 'number' ? q.options[q.correctOptionIndex] : ''}
                    </strong>
                  </p>
                ) : (
                  <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#0B1020] p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    <strong>Your Answer:</strong> {resp?.textAnswer || 'No response submitted.'}
                  </div>
                )}
                <div className="text-sm text-slate-700 dark:text-slate-200 bg-indigo-500/5 border border-indigo-500/20 p-3 rounded-lg whitespace-pre-wrap">
                  <strong className="text-xs text-indigo-600 dark:text-cyan-400 block mb-1">
                    Model Answer
                  </strong>
                  {q.modelAnswer}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Active Timed Mock Exam Console
  if (examQuestions.length > 0) {
    const q = examQuestions[currentIdx];
    const resp = responses[q.id] ?? {};
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Question Console */}
        <div className="lg:col-span-8 rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Question {currentIdx + 1} of {examQuestions.length} · Unit {q.unitNumber} · {q.marks} Marks
            </div>
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-mono font-semibold tabular-nums ${
                remainingSeconds < 120
                  ? 'bg-red-500/15 text-red-500'
                  : 'bg-slate-100 dark:bg-[#0B1020] text-slate-900 dark:text-cyan-300'
              }`}
            >
              <Clock className="h-4 w-4" />
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-indigo-600 dark:text-cyan-400">
              {q.topicTitle} · {q.category}
            </p>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              {q.question}
            </h2>
          </div>

          {q.options ? (
            <div className="space-y-2.5">
              {q.options.map((opt, idx) => {
                const checked = resp.selectedOption === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      setResponses((prev) => ({
                        ...prev,
                        [q.id]: { ...prev[q.id], selectedOption: idx },
                      }))
                    }
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                      checked
                        ? 'bg-indigo-600/15 border-indigo-500 text-slate-900 dark:text-white'
                        : 'bg-slate-50 dark:bg-[#0B1020] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-indigo-500/60'
                    }`}
                  >
                    <strong className="mr-2 font-mono">{String.fromCharCode(65 + idx)}.</strong>
                    {opt}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1.5">
              <label htmlFor={`mock-ans-${q.id}`} className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                Your Examination Answer (include key terms &amp; formulas)
              </label>
              <textarea
                id={`mock-ans-${q.id}`}
                rows={7}
                value={resp.textAnswer || ''}
                onChange={(e) =>
                  setResponses((prev) => ({
                    ...prev,
                    [q.id]: { ...prev[q.id], textAnswer: e.target.value },
                  }))
                }
                placeholder="Write your structured engineering answer here..."
                className="w-full p-3.5 rounded-xl text-sm bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() =>
                setResponses((prev) => ({
                  ...prev,
                  [q.id]: { ...prev[q.id], markedForReview: !prev[q.id]?.markedForReview },
                }))
              }
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border ${
                resp.markedForReview
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Flag className="h-3.5 w-3.5" />
              {resp.markedForReview ? 'Marked for Review' : 'Mark for Review'}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-800 disabled:opacity-40 text-slate-700 dark:text-slate-200"
              >
                Previous
              </button>
              {currentIdx < examQuestions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIdx((i) => i + 1)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(true)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  Submit Examination
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Question Palette Sidebar */}
        <aside className="lg:col-span-4 rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-5 space-y-5 h-fit">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Question Navigation
          </h3>

          <div className="grid grid-cols-5 gap-2">
            {examQuestions.map((item, idx) => {
              const r = responses[item.id];
              const isAnswered =
                typeof r?.selectedOption === 'number' || Boolean(r?.textAnswer?.trim());
              const isMarked = Boolean(r?.markedForReview);
              const isCurrent = idx === currentIdx;

              let style =
                'bg-slate-100 dark:bg-[#0B1020] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300';
              if (isMarked) {
                style = 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-300';
              } else if (isAnswered) {
                style = 'bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300';
              }
              if (isCurrent) {
                style += ' ring-2 ring-indigo-500';
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentIdx(idx)}
                  aria-label={`Jump to question ${idx + 1}`}
                  className={`h-10 rounded-lg border text-xs font-semibold tabular-nums ${style}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
            <p>Green: Answered · Amber: Marked for Review</p>
          </div>

          <button
            type="button"
            onClick={() => setShowSubmitModal(true)}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"
          >
            Submit Examination
          </button>
        </aside>

        {/* Submit Confirmation Modal */}
        {showSubmitModal && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          >
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                Submit Mock Examination?
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                You have answered{' '}
                {
                  examQuestions.filter(
                    (it) =>
                      typeof responses[it.id]?.selectedOption === 'number' ||
                      Boolean(responses[it.id]?.textAnswer?.trim())
                  ).length
                }{' '}
                of {examQuestions.length} questions. Once submitted, your responses will be graded and saved.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Continue Exam
                </button>
                <button
                  type="button"
                  onClick={handleSubmitExam}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  Confirm Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Configurator Screen
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
            Mock Examination Simulator
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Simulate timed university DECO examinations with question palettes, review flags, and post-exam analytics.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="mock-scope" className="block text-xs font-medium text-slate-600 dark:text-slate-300">
              Exam Scope
            </label>
            <select
              id="mock-scope"
              value={scope}
              onChange={(e) => setScope(e.target.value as 'unit' | 'full')}
              className="w-full h-10 px-3 rounded-lg text-sm bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="full">Full 5-Unit Syllabus</option>
              <option value="unit">Individual Unit Examination</option>
            </select>
          </div>

          {scope === 'unit' && (
            <div className="space-y-1.5">
              <label htmlFor="mock-unit" className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                Unit
              </label>
              <select
                id="mock-unit"
                value={unitNumber}
                onChange={(e) => setUnitNumber(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                className="w-full h-10 px-3 rounded-lg text-sm bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
              >
                {workspace.units.map((u) => (
                  <option key={u.unitNumber} value={u.unitNumber}>
                    Unit {u.unitNumber}: {u.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="mock-duration" className="block text-xs font-medium text-slate-600 dark:text-slate-300">
              Duration (Minutes)
            </label>
            <input
              id="mock-duration"
              type="number"
              min={5}
              max={180}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Math.max(5, Number(e.target.value)))}
              className="w-full h-10 px-3 rounded-lg text-sm bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 tabular-nums"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="mock-marks" className="block text-xs font-medium text-slate-600 dark:text-slate-300">
              Target Total Marks
            </label>
            <input
              id="mock-marks"
              type="number"
              min={10}
              max={100}
              value={totalMarks}
              onChange={(e) => setTotalMarks(Math.max(10, Number(e.target.value)))}
              className="w-full h-10 px-3 rounded-lg text-sm bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 tabular-nums"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="mock-qcount" className="block text-xs font-medium text-slate-600 dark:text-slate-300">
              Number of Questions
            </label>
            <input
              id="mock-qcount"
              type="number"
              min={3}
              max={20}
              value={questionCount}
              onChange={(e) => setQuestionCount(Math.min(20, Math.max(3, Number(e.target.value))))}
              className="w-full h-10 px-3 rounded-lg text-sm bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 tabular-nums"
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Question Categories
          </p>
          <div className="flex flex-wrap gap-2">
            {ALL_CATEGORIES.map((cat) => {
              const checked = categories.includes(cat.id);
              return (
                <label
                  key={cat.id}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                    checked
                      ? 'bg-indigo-600/15 border-indigo-500 text-indigo-700 dark:text-indigo-200'
                      : 'bg-slate-50 dark:bg-[#0B1020] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setCategories((prev) =>
                        checked ? prev.filter((c) => c !== cat.id) : [...prev, cat.id]
                      )
                    }
                    className="rounded border-slate-300 dark:border-slate-700"
                  />
                  {cat.label}
                </label>
              );
            })}
          </div>
        </div>

        {errorMsg && (
          <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {errorMsg}
          </p>
        )}

        <button
          type="button"
          onClick={handleStartExam}
          disabled={generating}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {generating ? 'Generating Exam Paper...' : 'Start Mock Examination'}
        </button>
      </div>
    </div>
  );
};

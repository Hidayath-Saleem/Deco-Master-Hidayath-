import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ListChecks,
  Loader2,
  Play,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import type { MCQQuestion, NavSection, QuizAttempt, WorkspaceState } from '../types/deco';
import { scoreQuizAttempt } from '../utils/progress';

interface PracticeTestsViewProps {
  workspace: WorkspaceState;
  onGenerateMcqs: (params: {
    unitNumber?: 1 | 2 | 3 | 4 | 5;
    topicTitle?: string;
    count: number;
  }) => Promise<MCQQuestion[]>;
  onSaveQuizAttempt: (attempt: QuizAttempt) => Promise<void>;
  onNavigate: (section: NavSection) => void;
}

export const PracticeTestsView: React.FC<PracticeTestsViewProps> = ({
  workspace,
  onGenerateMcqs,
  onSaveQuizAttempt,
  onNavigate,
}) => {
  const [mode, setMode] = useState<QuizAttempt['mode']>('unit');
  const [unitNumber, setUnitNumber] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [topicTitle, setTopicTitle] = useState<string>('');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeQuestions, setActiveQuestions] = useState<MCQQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completedAttempt, setCompletedAttempt] = useState<QuizAttempt | null>(null);

  const hasSyllabus = workspace.units.some((u) => u.topics.length > 0);
  const unitTopics =
    workspace.units.find((u) => u.unitNumber === unitNumber)?.topics ?? [];

  useEffect(() => {
    if (activeQuestions.length === 0 || completedAttempt) return;
    const timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [activeQuestions.length, completedAttempt]);

  const handleStartQuiz = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const generated = await onGenerateMcqs({
        unitNumber: mode === 'unit' || mode === 'topic' ? unitNumber : undefined,
        topicTitle: mode === 'topic' && topicTitle ? topicTitle : undefined,
        count: questionCount,
      });
      if (generated.length === 0) {
        throw new Error('No syllabus-aligned MCQs could be generated from the current notes.');
      }
      setActiveQuestions(generated);
      setCurrentIdx(0);
      setSelections({});
      setElapsedSeconds(0);
      setCompletedAttempt(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to start practice quiz.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishQuiz = async () => {
    const attempt = scoreQuizAttempt({
      id: `quiz_${Date.now().toString(36)}`,
      mode,
      unitNumber: mode === 'unit' || mode === 'topic' ? unitNumber : undefined,
      questions: activeQuestions,
      selections,
      timeTakenSeconds: elapsedSeconds,
    });
    setCompletedAttempt(attempt);
    await onSaveQuizAttempt(attempt);
  };

  if (!hasSyllabus) {
    return (
      <div className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
        <ListChecks className="h-10 w-10 text-indigo-500 mx-auto" />
        <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
          Syllabus Required for Practice Tests
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
          Practice questions are generated strictly from your extracted DECO syllabus and uploaded notes. Upload notes and extract your syllabus first.
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

  // Results Screen
  if (completedAttempt) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-indigo-600 dark:text-cyan-400">
                Practice Quiz Complete
              </p>
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
                Score: {completedAttempt.correctCount}/{completedAttempt.totalQuestions} ({completedAttempt.scorePercent}%)
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveQuestions([]);
                setCompletedAttempt(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"
            >
              <RotateCcw className="h-4 w-4" />
              New Practice Test
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Percentage</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                {completedAttempt.scorePercent}%
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Correct</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {completedAttempt.correctCount}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Incorrect</p>
              <p className="text-lg font-bold text-red-500 tabular-nums">
                {completedAttempt.totalQuestions - completedAttempt.correctCount}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Time Taken</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                {Math.floor(completedAttempt.timeTakenSeconds / 60)}m {completedAttempt.timeTakenSeconds % 60}s
              </p>
            </div>
          </div>

          {completedAttempt.weakTopics.length > 0 && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 space-y-1">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                Weak &amp; Recommended Topics for Revision
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-200">
                {completedAttempt.weakTopics.join(' · ')}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active Quiz Runner
  if (activeQuestions.length > 0) {
    const q = activeQuestions[currentIdx];
    const selected = selections[q.id];
    const hasAnswered = typeof selected === 'number';
    const isCorrect = selected === q.correctIndex;
    const answeredCount = Object.keys(selections).length;

    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          <span>
            Question {currentIdx + 1} of {activeQuestions.length} · Unit {q.unitNumber} ({q.topicTitle})
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}
          </span>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-6 space-y-5">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white leading-snug">
            {q.question}
          </h2>

          <div className="space-y-2.5">
            {q.options.map((opt, idx) => {
              const isChosen = selected === idx;
              const isRightOption = q.correctIndex === idx;
              let btnStyle =
                'bg-slate-50 dark:bg-[#0B1020] border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-indigo-500';
              if (hasAnswered) {
                if (isRightOption) {
                  btnStyle =
                    'bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-200';
                } else if (isChosen) {
                  btnStyle = 'bg-red-500/15 border-red-500 text-red-700 dark:text-red-300';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={hasAnswered}
                  onClick={() => setSelections((prev) => ({ ...prev, [q.id]: idx }))}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors flex items-center justify-between gap-3 ${btnStyle}`}
                >
                  <span>
                    <strong className="mr-2 font-mono">{String.fromCharCode(65 + idx)}.</strong>
                    {opt}
                  </span>
                  {hasAnswered && isRightOption && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                  {hasAnswered && isChosen && !isRightOption && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                </button>
              );
            })}
          </div>

          {hasAnswered && (
            <div className="rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 p-4 space-y-2 text-sm">
              <p className={`font-semibold ${isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                {isCorrect ? 'Correct Answer' : 'Incorrect Answer'}
              </p>
              <p className="text-slate-700 dark:text-slate-200">{q.explanation}</p>
              {q.wrongOptionNotes && q.wrongOptionNotes.length > 0 && (
                <ul className="list-disc pl-4 text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                  {q.wrongOptionNotes.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400">Source: {q.sourceRef}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-800 disabled:opacity-40 text-slate-700 dark:text-slate-200"
            >
              Previous
            </button>

            {currentIdx < activeQuestions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIdx((i) => i + 1)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Next Question
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishQuiz}
                disabled={answeredCount === 0}
                className="px-5 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white"
              >
                Finish &amp; View Results
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Configurator Screen
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
            Configure Practice Test
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Questions are generated exclusively from your uploaded DECO syllabus and notes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="quiz-mode" className="block text-xs font-medium text-slate-600 dark:text-slate-300">
              Quiz Mode
            </label>
            <select
              id="quiz-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as QuizAttempt['mode'])}
              className="w-full h-10 px-3 rounded-lg text-sm bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="unit">Unit-Wise Quiz</option>
              <option value="topic">Topic-Wise Quiz</option>
              <option value="random">Random Syllabus Mode</option>
              <option value="custom">Custom-Length Test</option>
              <option value="full">Full 5-Unit Syllabus Test</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="quiz-count" className="block text-xs font-medium text-slate-600 dark:text-slate-300">
              Number of Questions
            </label>
            <select
              id="quiz-count"
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-lg text-sm bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value={3}>3 Questions</option>
              <option value={5}>5 Questions</option>
              <option value={10}>10 Questions</option>
              <option value={15}>15 Questions</option>
            </select>
          </div>

          {(mode === 'unit' || mode === 'topic') && (
            <div className="space-y-1.5">
              <label htmlFor="quiz-unit" className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                Select Unit
              </label>
              <select
                id="quiz-unit"
                value={unitNumber}
                onChange={(e) => {
                  setUnitNumber(Number(e.target.value) as 1 | 2 | 3 | 4 | 5);
                  setTopicTitle('');
                }}
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

          {mode === 'topic' && (
            <div className="space-y-1.5">
              <label htmlFor="quiz-topic" className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                Select Topic
              </label>
              <select
                id="quiz-topic"
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                className="w-full h-10 px-3 rounded-lg text-sm bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="">Any Topic in Unit {unitNumber}</option>
                {unitTopics.map((t) => (
                  <option key={t.id} value={t.title}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {errorMsg && (
          <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {errorMsg}
          </p>
        )}

        <button
          type="button"
          onClick={handleStartQuiz}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {loading ? 'Generating Quiz...' : 'Start Practice Test'}
        </button>
      </div>
    </div>
  );
};

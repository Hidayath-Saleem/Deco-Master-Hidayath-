import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Eye,
  EyeOff,
  HelpCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import type { NavSection, QuestionCategory, WorkspaceState } from '../types/deco';
import { MarkdownContent } from './MarkdownContent';

interface ImportantQuestionsViewProps {
  workspace: WorkspaceState;
  onGenerateQuestions: (
    unitNumber: 1 | 2 | 3 | 4 | 5,
    category: QuestionCategory | 'all',
    count: number
  ) => Promise<void>;
  onToggleBookmark: (questionId: string) => Promise<void>;
  onNavigate: (section: NavSection) => void;
}

const CATEGORIES: { id: QuestionCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All Categories' },
  { id: '2-mark', label: '2-Mark' },
  { id: '5-mark', label: '5-Mark' },
  { id: '10-mark', label: '10-Mark' },
  { id: 'repeated', label: 'Repeated' },
  { id: 'definition', label: 'Definitions' },
  { id: 'numerical', label: 'Numerical' },
  { id: 'diagram', label: 'Diagram-Based' },
];

export const ImportantQuestionsView: React.FC<ImportantQuestionsViewProps> = ({
  workspace,
  onGenerateQuestions,
  onToggleBookmark,
  onNavigate,
}) => {
  const [unitFilter, setUnitFilter] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [categoryFilter, setCategoryFilter] = useState<QuestionCategory | 'all'>('all');
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeUnit = workspace.units.find((u) => u.unitNumber === unitFilter);
  const canGenerate = Boolean(activeUnit && activeUnit.topics.length > 0);

  const filteredQuestions = useMemo(() => {
    return workspace.importantQuestions.filter((q) => {
      if (q.unitNumber !== unitFilter) return false;
      if (categoryFilter !== 'all' && q.category !== categoryFilter) return false;
      if (bookmarkedOnly && !q.bookmarked) return false;
      return true;
    });
  }, [workspace.importantQuestions, unitFilter, categoryFilter, bookmarkedOnly]);

  const handleGenerate = async () => {
    setGenerating(true);
    setErrorMsg(null);
    try {
      await onGenerateQuestions(unitFilter, categoryFilter, 6);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate exam questions.');
    } finally {
      setGenerating(false);
    }
  };

  const toggleReveal = (id: string) => {
    const next = new Set(revealedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setRevealedIds(next);
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800">
            {([1, 2, 3, 4, 5] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnitFilter(u)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                  unitFilter === u
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Unit {u}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setBookmarkedOnly((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                bookmarkedOnly
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-300'
                  : 'bg-slate-50 dark:bg-[#0B1020] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Bookmark className="h-3.5 w-3.5" />
              Bookmarked Only
            </button>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate || generating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium whitespace-nowrap"
            >
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {generating ? 'Generating...' : `Generate Unit ${unitFilter} Questions`}
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                categoryFilter === cat.id
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-100 dark:bg-[#0B1020] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {errorMsg && (
          <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {errorMsg}
          </p>
        )}
      </div>

      {/* Question Cards */}
      {!canGenerate ? (
        <div className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
          <HelpCircle className="h-9 w-9 text-slate-400 mx-auto" />
          <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Extract Unit {unitFilter} Syllabus First
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Upload your college notes and extract the 5-unit syllabus before generating exam questions grounded in Unit {unitFilter}.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('materials')}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"
          >
            Go to Study Materials
          </button>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
          <Sparkles className="h-9 w-9 text-indigo-500 mx-auto" />
          <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            No Questions Yet for This Filter
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Click "Generate Unit {unitFilter} Questions" above to create exam questions with model answers, keywords, diagrams, and source references from your notes.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((q, index) => {
            const revealed = revealedIds.has(q.id);
            return (
              <article
                key={q.id}
                className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-6 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      <span className="font-semibold text-indigo-600 dark:text-cyan-400">
                        Q{index + 1}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">{q.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{q.marks} Marks</span>
                      <span aria-hidden="true">·</span>
                      <span>{q.topicTitle}</span>
                    </div>
                    <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                      {q.question}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleBookmark(q.id)}
                      aria-label={q.bookmarked ? 'Remove bookmark' : 'Bookmark question'}
                      className={`p-2 rounded-lg border transition-colors ${
                        q.bookmarked
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-500'
                          : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white'
                      }`}
                    >
                      {q.bookmarked ? (
                        <BookmarkCheck className="h-4 w-4" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleReveal(q.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-indigo-500 whitespace-nowrap"
                    >
                      {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {revealed ? 'Hide Answer' : 'Reveal Answer'}
                    </button>
                  </div>
                </div>

                {revealed && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    <MarkdownContent
                      content={q.answer}
                      className="text-slate-700 dark:text-slate-200"
                    />

                    {q.diagram && (
                      <div className="rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 p-4">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                          Diagram / Truth Table
                        </p>
                        <pre className="text-xs font-mono text-cyan-700 dark:text-cyan-300 overflow-x-auto">
                          {q.diagram}
                        </pre>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        <strong className="text-slate-700 dark:text-slate-300">Keywords:</strong>{' '}
                        {q.keywords.join(', ')}
                      </span>
                      <span>
                        <strong className="text-slate-700 dark:text-slate-300">Source:</strong>{' '}
                        {q.sourceRef}
                      </span>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

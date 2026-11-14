import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  Loader2,
  RotateCw,
  Shuffle,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import type { FlashcardDifficulty, NavSection, WorkspaceState } from '../types/deco';

interface FlashcardsViewProps {
  workspace: WorkspaceState;
  onGenerateFlashcards: (unitNumber: 1 | 2 | 3 | 4 | 5, count: number) => Promise<void>;
  onRateFlashcard: (cardId: string, difficulty: FlashcardDifficulty) => Promise<void>;
  onNavigate: (section: NavSection) => void;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  workspace,
  onGenerateFlashcards,
  onRateFlashcard,
  onNavigate,
}) => {
  const [unitFilter, setUnitFilter] = useState<'all' | 1 | 2 | 3 | 4 | 5>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'difficult'>('all');
  const [genUnit, setGenUnit] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffleOrder, setShuffleOrder] = useState<string[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hasSyllabus = workspace.units.some((u) => u.topics.length > 0);

  const deck = useMemo(() => {
    const filtered = workspace.flashcards.filter((c) => {
      if (unitFilter !== 'all' && c.unitNumber !== unitFilter) return false;
      if (difficultyFilter === 'difficult' && c.difficulty !== 'difficult') return false;
      return true;
    });

    if (!shuffleOrder) return filtered;
    const rank = new Map(shuffleOrder.map((id, i) => [id, i]));
    return [...filtered].sort((a, b) => (rank.get(a.id) ?? 9999) - (rank.get(b.id) ?? 9999));
  }, [workspace.flashcards, unitFilter, difficultyFilter, shuffleOrder]);

  const safeIdx = deck.length === 0 ? 0 : Math.min(currentIndex, deck.length - 1);
  const activeCard = deck[safeIdx];

  const handleShuffle = () => {
    const ids = deck.map((c) => c.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    setShuffleOrder(ids);
    setCurrentIndex(0);
    setFlipped(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setErrorMsg(null);
    try {
      await onGenerateFlashcards(genUnit, 8);
      setUnitFilter(genUnit);
      setDifficultyFilter('all');
      setCurrentIndex(0);
      setFlipped(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate flashcards.');
    } finally {
      setGenerating(false);
    }
  };

  if (!hasSyllabus) {
    return (
      <div className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
        <Layers className="h-10 w-10 text-indigo-500 mx-auto" />
        <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
          Upload Notes to Create Flashcards
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
          Flashcards are synthesized directly from your uploaded DECO notes and extracted 5-unit syllabus.
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Toolbar */}
      <div className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter flashcards by unit"
            value={unitFilter}
            onChange={(e) => {
              const v = e.target.value;
              setUnitFilter(v === 'all' ? 'all' : (Number(v) as 1 | 2 | 3 | 4 | 5));
              setCurrentIndex(0);
              setFlipped(false);
            }}
            className="h-9 px-3 rounded-lg text-xs font-medium bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Units</option>
            <option value="1">Unit 1</option>
            <option value="2">Unit 2</option>
            <option value="3">Unit 3</option>
            <option value="4">Unit 4</option>
            <option value="5">Unit 5</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setDifficultyFilter((d) => (d === 'all' ? 'difficult' : 'all'));
              setCurrentIndex(0);
              setFlipped(false);
            }}
            className={`h-9 px-3 rounded-lg text-xs font-medium border ${
              difficultyFilter === 'difficult'
                ? 'bg-red-500/15 border-red-500/40 text-red-600 dark:text-red-300'
                : 'bg-slate-50 dark:bg-[#0B1020] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {difficultyFilter === 'difficult' ? 'Reviewing Difficult Cards' : 'Review Difficult Only'}
          </button>

          <button
            type="button"
            onClick={handleShuffle}
            disabled={deck.length < 2}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40"
          >
            <Shuffle className="h-3.5 w-3.5" />
            Shuffle
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label="Unit to generate flashcards for"
            value={genUnit}
            onChange={(e) => setGenUnit(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
            className="h-9 px-2.5 rounded-lg text-xs bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
          >
            {[1, 2, 3, 4, 5].map((u) => (
              <option key={u} value={u}>
                Unit {u}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium whitespace-nowrap"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Generate Cards
          </button>
        </div>
      </div>

      {errorMsg && (
        <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {errorMsg}
        </p>
      )}

      {/* Interactive Flip Card */}
      {!activeCard ? (
        <div className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-12 text-center space-y-2">
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            No flashcards match this filter yet
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select a unit and click "Generate Cards" above to build active recall flashcards from your DECO notes.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            <span>
              Card {safeIdx + 1} of {deck.length} · Unit {activeCard.unitNumber} · {activeCard.topicTitle}
            </span>
            <span className="capitalize">Status: {activeCard.difficulty}</span>
          </div>

          <div className="perspective-1000">
            <button
              type="button"
              onClick={() => setFlipped((f) => !f)}
              aria-label={flipped ? 'Show card question' : 'Flip card to reveal answer'}
              className={`relative w-full min-h-[290px] rounded-2xl transition-transform duration-500 preserve-3d cursor-pointer text-left ${
                flipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* Front */}
              <div className="absolute inset-0 backface-hidden rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-8 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-indigo-600 dark:text-cyan-400 font-medium">
                  <span>Question / Concept</span>
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <RotateCw className="h-3.5 w-3.5" />
                    Click to flip
                  </span>
                </div>
                <p className="font-display text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white text-center px-4">
                  {activeCard.front}
                </p>
                <p className="text-xs text-slate-400 text-center">
                  Unit {activeCard.unitNumber} · {activeCard.topicTitle}
                </p>
              </div>

              {/* Back */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl bg-indigo-950/5 dark:bg-[#141F3D] border border-indigo-500/40 p-8 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-cyan-600 dark:text-cyan-400 font-medium">
                  <span>Answer</span>
                  <span className="text-slate-400">Source: {activeCard.sourceRef}</span>
                </div>
                <p className="text-base sm:text-lg text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap text-center px-2">
                  {activeCard.back}
                </p>
                <p className="text-xs text-slate-400 text-center">Click to flip back</p>
              </div>
            </button>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCurrentIndex((i) => (i - 1 + deck.length) % deck.length);
                  setFlipped(false);
                }}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg text-sm font-medium bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentIndex((i) => (i + 1) % deck.length);
                  setFlipped(false);
                }}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg text-sm font-medium bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await onRateFlashcard(activeCard.id, 'difficult');
                  setCurrentIndex((i) => (i + 1) % deck.length);
                  setFlipped(false);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-500/15 hover:bg-red-500/25 text-red-600 dark:text-red-300 border border-red-500/30"
              >
                <ThumbsDown className="h-4 w-4" />
                Mark as Difficult
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onRateFlashcard(activeCard.id, 'easy');
                  setCurrentIndex((i) => (i + 1) % deck.length);
                  setFlipped(false);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
              >
                <ThumbsUp className="h-4 w-4" />
                Mark as Easy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

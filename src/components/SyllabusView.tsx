import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Loader2,
  Sparkles,
} from 'lucide-react';
import type { NavSection, Topic, TopicStatus, Unit, WorkspaceState } from '../types/deco';
import { calculateUnitProgress } from '../utils/progress';
import { MarkdownContent } from './MarkdownContent';

interface SyllabusViewProps {
  workspace: WorkspaceState;
  selectedUnit: 1 | 2 | 3 | 4 | 5;
  selectedTopicId: string | null;
  onSelectUnit: (unit: 1 | 2 | 3 | 4 | 5) => void;
  onSelectTopic: (topicId: string | null) => void;
  onUpdateTopicStatus: (unitNumber: 1 | 2 | 3 | 4 | 5, topicId: string, status: TopicStatus) => Promise<void>;
  onGenerateSmartStudy: (unitNumber: 1 | 2 | 3 | 4 | 5, topicId: string) => Promise<void>;
  onExtractSyllabus: () => Promise<void>;
  extractingSyllabus: boolean;
  onNavigate: (section: NavSection) => void;
}

type StudyModeTab = 'easy' | 'detailed' | 'exam' | 'revision';

export const SyllabusView: React.FC<SyllabusViewProps> = ({
  workspace,
  selectedUnit,
  selectedTopicId,
  onSelectUnit,
  onSelectTopic,
  onUpdateTopicStatus,
  onGenerateSmartStudy,
  onExtractSyllabus,
  extractingSyllabus,
  onNavigate,
}) => {
  const [studyTab, setStudyTab] = useState<StudyModeTab>('easy');
  const [examMarkTab, setExamMarkTab] = useState<'2' | '5' | '10'>('5');
  const [generatingSmart, setGeneratingSmart] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const unit: Unit | undefined = workspace.units.find((u) => u.unitNumber === selectedUnit);
  const activeTopic: Topic | undefined =
    unit?.topics.find((t) => t.id === selectedTopicId) ?? unit?.topics[0];

  useEffect(() => {
    if (unit && unit.topics.length > 0 && !unit.topics.some((t) => t.id === selectedTopicId)) {
      onSelectTopic(unit.topics[0].id);
    }
  }, [selectedUnit, unit, selectedTopicId, onSelectTopic]);

  const handleGenerateStudy = async () => {
    if (!activeTopic) return;
    setGeneratingSmart(true);
    setErrorMsg(null);
    try {
      await onGenerateSmartStudy(selectedUnit, activeTopic.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate Smart Study notes.');
    } finally {
      setGeneratingSmart(false);
    }
  };

  const hasDocuments = workspace.documents.length > 0;
  const hasAnyTopics = workspace.units.some((u) => u.topics.length > 0);

  return (
    <div className="space-y-6">
      {/* Unit Switcher & Syllabus Extraction Action */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#11182C] border border-slate-200 dark:border-slate-800">
          {([1, 2, 3, 4, 5] as const).map((num) => {
            const u = workspace.units.find((item) => item.unitNumber === num);
            const prog = u ? calculateUnitProgress(u) : { percentage: 0 };
            const isActive = selectedUnit === num;
            return (
              <button
                key={num}
                type="button"
                onClick={() => onSelectUnit(num)}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap tabular-nums ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Unit {num} · {prog.percentage}%
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onExtractSyllabus}
          disabled={!hasDocuments || extractingSyllabus}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium whitespace-nowrap shrink-0 transition-colors"
        >
          {extractingSyllabus ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {extractingSyllabus
            ? 'Extracting Syllabus...'
            : hasAnyTopics
            ? 'Re-Extract Syllabus from Notes'
            : 'Extract 5-Unit Syllabus'}
        </button>
      </div>

      {!hasDocuments ? (
        <div className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
          <BookOpen className="h-10 w-10 text-indigo-500 mx-auto" />
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
            Upload Your DECO Notes to Unlock Unit {selectedUnit}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto">
            DECO Master never invents syllabus topics. Upload your college PDFs or sync your Google Drive folder in Study Materials, then extract the actual five units directly from your notes.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('materials')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"
          >
            <FileText className="h-4 w-4" />
            Go to Study Materials
          </button>
        </div>
      ) : !unit || unit.topics.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
          <Sparkles className="h-10 w-10 text-cyan-500 mx-auto" />
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
            {unit ? unit.title : `Unit ${selectedUnit}`}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto">
            {unit?.overview ||
              'Click "Extract 5-Unit Syllabus" above to organize all five DECO units and topics from your indexed documents.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column: Unit Details + Topic List */}
          <div className="xl:col-span-4 space-y-4">
            <div className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <div className="flex items-center justify-between text-xs text-indigo-600 dark:text-cyan-400 font-semibold">
                <span>Unit {unit.unitNumber}</span>
                <span className="tabular-nums">
                  {calculateUnitProgress(unit).completedTopics}/{unit.topics.length} Completed
                </span>
              </div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                {unit.title}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {unit.overview}
              </p>

              {unit.learningObjectives.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Learning Objectives
                  </p>
                  <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400 list-disc pl-4">
                    {unit.learningObjectives.map((obj, idx) => (
                      <li key={idx}>{obj}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Topic List */}
            <div className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-4 space-y-2">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2 pb-1">
                Topics in Unit {unit.unitNumber}
              </h3>
              <ul className="space-y-1.5">
                {unit.topics.map((topic) => {
                  const isActive = activeTopic?.id === topic.id;
                  return (
                    <li key={topic.id}>
                      <button
                        type="button"
                        onClick={() => onSelectTopic(topic.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors flex items-start gap-2.5 ${
                          isActive
                            ? 'bg-indigo-600/10 border-indigo-500/40 text-slate-900 dark:text-white'
                            : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="mt-0.5 shrink-0">
                          {topic.status === 'completed' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : topic.status === 'in_progress' ? (
                            <Clock className="h-4 w-4 text-amber-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-slate-400" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug">{topic.title}</p>
                          {topic.sourceRefs[0] && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                              {topic.sourceRefs[0].docName}, p. {topic.sourceRefs[0].pageNumber}
                            </p>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {unit.revisionSummary && (
              <div className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-5 space-y-2">
                <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                  Unit Revision Summary
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {unit.revisionSummary}
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Topic Details + Smart Study Mode */}
          {activeTopic && (
            <div className="xl:col-span-8 space-y-6">
              {/* Topic Header & Status Controls */}
              <div className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-indigo-600 dark:text-cyan-400">
                      Unit {unit.unitNumber} · {unit.title}
                    </p>
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                      {activeTopic.title}
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {activeTopic.description}
                    </p>
                  </div>

                  {/* Status Selector */}
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 shrink-0">
                    {(
                      [
                        { id: 'not_started', label: 'Not Started' },
                        { id: 'in_progress', label: 'In Progress' },
                        { id: 'completed', label: 'Completed' },
                      ] as const
                    ).map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => onUpdateTopicStatus(selectedUnit, activeTopic.id, st.id)}
                        className={`px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                          activeTopic.status === st.id
                            ? st.id === 'completed'
                              ? 'bg-emerald-600 text-white'
                              : st.id === 'in_progress'
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-700 text-white'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {activeTopic.sourceRefs.length > 0 && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-1 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Source Notes:</span>
                    {activeTopic.sourceRefs.map((ref, idx) => (
                      <span key={idx}>
                        {ref.docName} (p. {ref.pageNumber})
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Smart Study Mode */}
              <div className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                      Smart Study Mode
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Switch between Easy Explanation, Detailed Notes, Exam-Ready Answers, and Quick Revision.
                    </p>
                  </div>

                  {activeTopic.smartStudy && (
                    <button
                      type="button"
                      onClick={handleGenerateStudy}
                      disabled={generatingSmart}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium whitespace-nowrap shrink-0"
                    >
                      {generatingSmart ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {generatingSmart ? 'Refreshing...' : 'Refresh from Notes'}
                    </button>
                  )}
                </div>

                {errorMsg && (
                  <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                    {errorMsg}
                  </p>
                )}

                {/* Format Switcher */}
                <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800">
                  {(
                    [
                      { id: 'easy', label: 'A. Easy Explanation' },
                      { id: 'detailed', label: 'B. Detailed Notes' },
                      { id: 'exam', label: 'C. Exam-Ready Answer' },
                      { id: 'revision', label: 'D. Quick Revision' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStudyTab(tab.id)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                        studyTab === tab.id
                          ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {!activeTopic.smartStudy ? (
                  <div className="py-8 text-center space-y-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Generate the 4-format Smart Study Pack for <strong>{activeTopic.title}</strong> grounded in your uploaded college notes.
                    </p>
                    <button
                      type="button"
                      onClick={handleGenerateStudy}
                      disabled={generatingSmart}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"
                    >
                      {generatingSmart ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Generate Smart Study Pack
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {studyTab === 'easy' && (
                      <MarkdownContent
                        content={activeTopic.smartStudy.easyExplanation}
                        className="text-slate-700 dark:text-slate-200"
                      />
                    )}

                    {studyTab === 'detailed' && (
                      <MarkdownContent
                        content={activeTopic.smartStudy.detailedNotes}
                        className="text-slate-700 dark:text-slate-200"
                      />
                    )}

                    {studyTab === 'exam' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          {(['2', '5', '10'] as const).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setExamMarkTab(m)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                                examMarkTab === m
                                  ? 'bg-cyan-600 text-white border-cyan-600'
                                  : 'bg-slate-50 dark:bg-[#0B1020] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              {m}-Mark Answer
                            </button>
                          ))}
                        </div>
                        <div className="rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 p-4 text-slate-800 dark:text-slate-200">
                          <MarkdownContent
                            content={
                              examMarkTab === '2'
                                ? activeTopic.smartStudy.examAnswers.marks2
                                : examMarkTab === '5'
                                ? activeTopic.smartStudy.examAnswers.marks5
                                : activeTopic.smartStudy.examAnswers.marks10
                            }
                          />
                        </div>
                      </div>
                    )}

                    {studyTab === 'revision' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                          <h4 className="text-xs font-semibold text-indigo-600 dark:text-cyan-400">
                            Key Points
                          </h4>
                          <ul className="list-disc pl-4 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                            {activeTopic.smartStudy.quickRevision.keyPoints.map((pt, i) => (
                              <li key={i}>{pt}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                          <h4 className="text-xs font-semibold text-indigo-600 dark:text-cyan-400">
                            Formulas &amp; Memory Tricks
                          </h4>
                          {activeTopic.smartStudy.quickRevision.formulas.length > 0 && (
                            <ul className="space-y-1 font-mono text-xs text-cyan-700 dark:text-cyan-300">
                              {activeTopic.smartStudy.quickRevision.formulas.map((f, i) => (
                                <li key={i} className="bg-white dark:bg-[#11182C] px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-800">
                                  {f}
                                </li>
                              ))}
                            </ul>
                          )}
                          <ul className="list-disc pl-4 space-y-1 text-sm text-slate-700 dark:text-slate-300 pt-1">
                            {activeTopic.smartStudy.quickRevision.memoryTricks.map((m, i) => (
                              <li key={i}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {activeTopic.smartStudy.citations.length > 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                        Grounded in:{' '}
                        {activeTopic.smartStudy.citations
                          .map((c) => `${c.docName} (p. ${c.pageNumber})`)
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Extracted Definitions, Formulas, Diagrams & Worked Examples */}
              {(activeTopic.definitions.length > 0 ||
                activeTopic.formulas.length > 0 ||
                activeTopic.diagrams.length > 0 ||
                activeTopic.workedExamples.length > 0) && (
                <div className="rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 p-6 space-y-5">
                  <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                    Extracted Definitions, Formulas &amp; Examples
                  </h3>

                  {activeTopic.definitions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Important Definitions
                      </h4>
                      <dl className="space-y-2">
                        {activeTopic.definitions.map((d, i) => (
                          <div
                            key={i}
                            className="rounded-lg bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 p-3"
                          >
                            <dt className="text-sm font-semibold text-slate-900 dark:text-white">
                              {d.term}
                            </dt>
                            <dd className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                              {d.definition}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}

                  {activeTopic.formulas.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Important Formulas
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {activeTopic.formulas.map((f, i) => (
                          <code
                            key={i}
                            className="block rounded-lg bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-indigo-700 dark:text-cyan-300"
                          >
                            {f}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTopic.diagrams.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Diagrams &amp; Truth Tables
                      </h4>
                      {activeTopic.diagrams.map((diag, i) => (
                        <div
                          key={i}
                          className="rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 p-4 space-y-2"
                        >
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">
                            {diag.title}
                          </p>
                          <pre className="text-xs font-mono text-slate-700 dark:text-cyan-200 overflow-x-auto leading-relaxed">
                            {diag.diagramText}
                          </pre>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{diag.caption}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTopic.workedExamples.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Worked Examples
                      </h4>
                      {activeTopic.workedExamples.map((ex, i) => (
                        <div
                          key={i}
                          className="rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 p-4 space-y-2"
                        >
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {ex.title}
                          </p>
                          <p className="text-sm text-slate-700 dark:text-slate-300">{ex.problem}</p>
                          <pre className="text-xs font-mono whitespace-pre-wrap text-emerald-700 dark:text-emerald-300 bg-white dark:bg-[#11182C] p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                            {ex.solution}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

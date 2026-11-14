import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Bot,
  Loader2,
  Send,
  Trash2,
} from 'lucide-react';
import type { NavSection, WorkspaceState } from '../types/deco';
import { MarkdownContent } from './MarkdownContent';

interface AiTutorViewProps {
  workspace: WorkspaceState;
  onSendQuestion: (question: string) => Promise<void>;
  onClearHistory: () => Promise<void>;
  onNavigate: (section: NavSection) => void;
}

const SUGGESTED_PROMPTS = [
  'Explain this topic in simple words',
  'Give me a 5-mark answer',
  'Explain with a diagram',
  'Give me an example',
  'What are the important exam points?',
  'Test my understanding',
];

export const AiTutorView: React.FC<AiTutorViewProps> = ({
  workspace,
  onSendQuestion,
  onClearHistory,
  onNavigate,
}) => {
  const [input, setInput] = useState('');
  const [selectedTopicLabel, setSelectedTopicLabel] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const topicOptions = useMemo(
    () =>
      workspace.units.flatMap((u) =>
        u.topics.map((t) => ({
          id: t.id,
          label: `Unit ${u.unitNumber}: ${t.title}`,
        }))
      ),
    [workspace.units]
  );

  const submitQuestion = async (rawQuestion: string) => {
    const trimmed = rawQuestion.trim();
    if (!trimmed || sending) return;
    const contextualPrompt =
      selectedTopicLabel && !trimmed.toLowerCase().includes(selectedTopicLabel.toLowerCase())
        ? `[Context: ${selectedTopicLabel}] ${trimmed}`
        : trimmed;

    setSending(true);
    setErrorMsg(null);
    setInput('');
    try {
      await onSendQuestion(contextualPrompt);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to get AI Tutor response.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] min-h-[540px] rounded-2xl bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800/80 overflow-hidden">
      {/* Header Bar */}
      <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-indigo-600/15 text-indigo-600 dark:text-cyan-400 flex items-center justify-center">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              DECO RAG Tutor
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Prioritizing {workspace.documents.length} uploaded document(s) · {workspace.chunks.length} chunks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {topicOptions.length > 0 && (
            <select
              aria-label="Select topic context for AI Tutor"
              value={selectedTopicLabel}
              onChange={(e) => setSelectedTopicLabel(e.target.value)}
              className="h-8 max-w-[230px] px-2.5 rounded-lg text-xs bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 truncate"
            >
              <option value="">All DECO Topics</option>
              {topicOptions.map((opt) => (
                <option key={opt.id} value={opt.label}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
          {workspace.chatHistory.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-slate-500 hover:text-red-500 hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear Chat
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {workspace.documents.length === 0 && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
            <div className="flex items-start gap-2.5 text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                No college notes have been uploaded yet. Upload your DECO PDFs first so the AI Tutor can cite your exact notes and page numbers.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('materials')}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium whitespace-nowrap shrink-0"
            >
              Upload Notes
            </button>
          </div>
        )}

        {workspace.chatHistory.length === 0 ? (
          <div className="py-10 text-center space-y-5 max-w-xl mx-auto">
            <BookOpen className="h-9 w-9 text-indigo-500 mx-auto" />
            <div className="space-y-1.5">
              <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                Ask Anything About Your DECO Syllabus
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Answers retrieve relevant sections from your uploaded notes first, include document and page citations, and explicitly distinguish supplementary explanations when a concept is missing from your notes.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => submitQuestion(prompt)}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 dark:bg-[#0B1020] hover:bg-indigo-600 hover:text-white border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          workspace.chatHistory.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-2xl px-4 py-3 text-sm leading-relaxed space-y-2.5 ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100'
                }`}
              >
                {msg.role === 'assistant' && msg.usedSupplementaryKnowledge && (
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    Includes supplementary DECO explanation (not fully covered in uploaded notes)
                  </p>
                )}

                {msg.role === 'assistant' ? (
                  <MarkdownContent content={msg.content} />
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}

                {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
                    <p className="text-[11px] font-semibold text-indigo-600 dark:text-cyan-400">
                      Sources Cited
                    </p>
                    <ul className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                      {msg.citations.map((c, idx) => (
                        <li key={idx}>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {c.docName} (p. {c.pageNumber})
                          </span>
                          {c.excerpt ? ` — "${c.excerpt}..."` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400 inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
              Searching your DECO notes and drafting answer...
            </div>
          </div>
        )}

        {errorMsg && (
          <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {errorMsg}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick Prompt Strip + Composer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0E1528] space-y-2.5">
        {workspace.chatHistory.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pb-1">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => submitQuestion(prompt)}
                disabled={sending}
                className="px-2.5 py-1 rounded-md text-xs bg-white dark:bg-[#11182C] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-500 whitespace-nowrap shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitQuestion(input);
          }}
          className="flex items-center gap-2"
        >
          <label htmlFor="ai-tutor-input" className="sr-only">
            Ask a DECO question
          </label>
          <input
            id="ai-tutor-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a DECO question, request a comparison table, or ask for a 5-mark answer..."
            disabled={sending}
            className="flex-1 h-11 px-4 rounded-xl text-sm bg-white dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            aria-label="Send question to AI Tutor"
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium whitespace-nowrap shrink-0"
          >
            <Send className="h-4 w-4" />
            Ask
          </button>
        </form>
      </div>
    </div>
  );
};

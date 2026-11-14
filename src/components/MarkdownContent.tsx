import React from 'react';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

function renderInline(text: string): React.ReactNode[] {
  // Split by inline code `...` or bold **...**
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return tokens.map((tok, i) => {
    if (tok.startsWith('`') && tok.endsWith('`') && tok.length >= 2) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-indigo-700 dark:text-cyan-300 font-mono text-[0.85em]"
        >
          {tok.slice(1, -1)}
        </code>
      );
    }
    if (tok.startsWith('**') && tok.endsWith('**') && tok.length >= 4) {
      return (
        <strong key={i} className="font-semibold text-slate-900 dark:text-white">
          {tok.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={i}>{tok}</React.Fragment>;
  });
}

function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith('|') && t.endsWith('|') && t.includes('|');
}

function isTableSeparator(line: string): boolean {
  const t = line.trim();
  return /^\|[\s:|-]+\|$/.test(t);
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, className = '' }) => {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Fenced code / ASCII diagram block
    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push(
        <pre
          key={`code-${blocks.length}`}
          className="rounded-xl bg-slate-100 dark:bg-[#080D1A] border border-slate-200 dark:border-slate-800 p-3.5 text-xs font-mono text-slate-800 dark:text-cyan-200 overflow-x-auto leading-relaxed"
        >
          {codeLines.join('\n')}
        </pre>
      );
      continue;
    }

    // Markdown table
    if (isTableRow(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headers = parseTableRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      blocks.push(
        <div
          key={`tbl-${blocks.length}`}
          className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"
        >
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800">
                {headers.map((h, hi) => (
                  <th
                    key={hi}
                    className="px-3 py-2 font-semibold text-slate-900 dark:text-white whitespace-nowrap"
                  >
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {rows.map((row, ri) => (
                <tr key={ri} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-slate-700 dark:text-slate-200 tabular-nums">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const sizeClass =
        level <= 2
          ? 'text-base font-bold text-slate-900 dark:text-white pt-2'
          : 'text-sm font-semibold text-indigo-700 dark:text-cyan-300 pt-1.5';
      blocks.push(
        <h4 key={`h-${blocks.length}`} className={`font-display ${sizeClass}`}>
          {renderInline(text)}
        </h4>
      );
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="list-disc pl-5 space-y-1 text-sm leading-relaxed">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={`ol-${blocks.length}`} className="list-decimal pl-5 space-y-1 text-sm leading-relaxed">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Blank line
    if (!trimmed) {
      i++;
      continue;
    }

    // Paragraph
    const paraLines: string[] = [trimmed];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('```') &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !isTableRow(lines[i])
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    blocks.push(
      <p key={`p-${blocks.length}`} className="text-sm leading-relaxed">
        {renderInline(paraLines.join(' '))}
      </p>
    );
  }

  return <div className={`space-y-2.5 ${className}`}>{blocks}</div>;
};

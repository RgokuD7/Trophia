import React from "react";

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

/**
 * Parses inline formatting:
 * - ***bold-italic***
 * - **bold**
 * - *italic*
 * - `code`
 * - Automatically balances unclosed asterisks or trailing :**
 */
export function parseInlineMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  let cleanText = text;

  // Fix unclosed bold tags (e.g. "Hidratación Inmediata (URGENTE):**")
  const boldCount = (cleanText.match(/\*\*/g) || []).length;
  if (boldCount % 2 !== 0) {
    if (cleanText.endsWith("**")) {
      cleanText = "**" + cleanText;
    } else {
      cleanText = cleanText + "**";
    }
  }

  // Tokenize bold-italic, bold, italic, code, or plain text
  const regex = /(\*\*\*[\s\S]+?\*\*\*|\*\*[\s\S]+?\*\*|\*[^\s*][^*]*?\*|`[^`]+`)/g;
  const parts = cleanText.split(regex);

  return parts.map((part, idx) => {
    if (!part) return null;

    if (part.startsWith("***") && part.endsWith("***") && part.length >= 6) {
      return (
        <strong key={idx} className="font-black italic text-amber-300">
          {part.slice(3, -3)}
        </strong>
      );
    }

    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={idx} className="font-extrabold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return (
        <em key={idx} className="italic text-emerald-300 font-medium">
          {part.slice(1, -1)}
        </em>
      );
    }

    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code key={idx} className="px-1.5 py-0.5 bg-black/60 border border-white/10 rounded font-mono text-[11px] text-emerald-400">
          {part.slice(1, -1)}
        </code>
      );
    }

    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

/**
 * Custom Markdown Renderer tailored for Coach Trophia messages
 */
export default function MarkdownMessage({ content, className = "" }: MarkdownMessageProps) {
  if (!content) return null;

  const lines = content.split("\n");

  return (
    <div className={`space-y-1.5 text-xs text-white/90 leading-relaxed ${className}`}>
      {lines.map((rawLine, lineIdx) => {
        let line = rawLine.trim();

        // Empty line
        if (!line) {
          return <div key={lineIdx} className="h-1" />;
        }

        // Horizontal divider (---, ***, ___)
        if (line === "---" || line === "***" || line === "___") {
          return <hr key={lineIdx} className="my-2 border-white/10" />;
        }

        // Normalize malformed LLM bullets: e.g. '***Plátano**' -> '* **Plátano**'
        if (line.startsWith("***") && !line.endsWith("***") && line.includes("**")) {
          line = "* **" + line.slice(3);
        }

        // Headers: #, ##, ###
        if (line.startsWith("### ")) {
          const headerText = line.slice(4).trim();
          // If it's just an isolated number or short label (e.g. "### 4")
          if (/^\d+$/.test(headerText)) {
            return (
              <div key={lineIdx} className="inline-block px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px] mt-1 mb-0.5 border border-amber-500/30">
                Paso {headerText}
              </div>
            );
          }
          return (
            <h4 key={lineIdx} className="text-xs font-black text-amber-400 uppercase tracking-wide mt-2 pt-0.5 mb-0.5 flex items-center gap-1.5">
              <span>{parseInlineMarkdown(headerText)}</span>
            </h4>
          );
        }

        if (line.startsWith("## ")) {
          return (
            <h3 key={lineIdx} className="text-sm font-black text-emerald-400 tracking-tight mt-2.5 pt-0.5 mb-0.5">
              {parseInlineMarkdown(line.slice(3))}
            </h3>
          );
        }

        if (line.startsWith("# ")) {
          return (
            <h2 key={lineIdx} className="text-base font-black text-emerald-400 tracking-tight mt-3 mb-1">
              {parseInlineMarkdown(line.slice(2))}
            </h2>
          );
        }

        // Bullet points: *, -, •, +
        const bulletMatch = line.match(/^(\*|-|•|\+)\s*(.*)$/);
        if (bulletMatch) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-1 my-1">
              <span className="text-emerald-400 text-xs shrink-0 select-none leading-relaxed">•</span>
              <div className="flex-1 min-w-0 leading-relaxed">
                {parseInlineMarkdown(bulletMatch[2])}
              </div>
            </div>
          );
        }

        // Numbered list: 1., 2., etc.
        const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-1 my-1">
              <span className="font-mono text-emerald-400 font-bold text-[11px] shrink-0 select-none leading-relaxed">
                {numMatch[1]}.
              </span>
              <div className="flex-1 min-w-0 leading-relaxed">
                {parseInlineMarkdown(numMatch[2])}
              </div>
            </div>
          );
        }

        // Regular paragraph
        return (
          <p key={lineIdx} className="leading-relaxed">
            {parseInlineMarkdown(line)}
          </p>
        );
      })}
    </div>
  );
}

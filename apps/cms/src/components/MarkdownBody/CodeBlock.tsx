import hljs from "highlight.js";

/** Languages the migrated articles use; auto-detection only picks among these. */
const LIKELY_LANGUAGES = [
  "bash",
  "shell",
  "python",
  "c",
  "cpp",
  "rust",
  "go",
  "makefile",
  "yaml",
  "json",
  "ini",
  "diff",
  "x86asm",
];

function highlight(code: string, language: string | undefined): string {
  if (language && hljs.getLanguage(language)) {
    return hljs.highlight(language, code, true).value;
  }
  return hljs.highlightAuto(code, LIKELY_LANGUAGES).value;
}

interface CodeBlockProps {
  code: string;
  language?: string;
}

/**
 * Listing in the old site's look: dark panel, line-number gutter, syntax colours and horizontal
 * scroll. Highlighted on the server; highlight.js escapes the source, so the HTML is safe.
 */
export function CodeBlock({ code, language }: CodeBlockProps) {
  const source = code.replace(/\n$/u, "");
  const lineCount = source.split("\n").length;

  return (
    <div className="not-prose my-6 flex overflow-hidden rounded-md bg-[#23241f] font-mono text-[0.85rem] leading-6 text-[#f8f8f2]">
      <pre
        aria-hidden
        className="m-0 shrink-0 select-none border-r border-white/10 bg-ct-racing-green/40 px-3 py-4 text-right text-white/50"
      >
        {Array.from({ length: lineCount }, (_, index) => index + 1).join("\n")}
      </pre>
      <pre className="hljs m-0 min-w-0 flex-1 overflow-x-auto px-4 py-4">
        <code
          className={language ? `language-${language}` : undefined}
          dangerouslySetInnerHTML={{ __html: highlight(source, language) }}
        />
      </pre>
    </div>
  );
}

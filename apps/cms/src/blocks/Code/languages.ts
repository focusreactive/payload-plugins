/**
 * Languages an editor can pick for a code block. The value is the lowercase id used in the
 * `language-*` class (highlighter convention); `plaintext` means "no highlighting".
 */
export const CODE_LANGUAGES = [
  { label: "TypeScript", value: "typescript" },
  { label: "JavaScript", value: "javascript" },
  { label: "TSX (React + TypeScript)", value: "tsx" },
  { label: "JSX (React)", value: "jsx" },
  { label: "JSON", value: "json" },
  { label: "Bash / Shell", value: "bash" },
  { label: "HTML", value: "html" },
  { label: "CSS", value: "css" },
  { label: "Python", value: "python" },
  { label: "SQL", value: "sql" },
  { label: "YAML", value: "yaml" },
  { label: "Markdown", value: "markdown" },
  { label: { en: "Plain text", es: "Texto sin formato" }, value: "plaintext" },
] as const;

export type CodeLanguage = (typeof CODE_LANGUAGES)[number]["value"];

export const DEFAULT_CODE_LANGUAGE: CodeLanguage = "plaintext";

import type { CodeInlineBlock } from "@/payload-types";

export function CodeInlineComponent({ code, language }: CodeInlineBlock) {
  return (
    <pre
      className="prose-embedded-block overflow-x-auto text-black"
      data-language={language ?? undefined}
    >
      <code className={language ? `language-${language}` : undefined}>{code}</code>
    </pre>
  );
}

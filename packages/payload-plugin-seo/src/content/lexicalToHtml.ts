import { convertLexicalToHTML } from "@payloadcms/richtext-lexical/html";

type LexicalValue = { root?: unknown } | null | undefined;

export function lexicalToHtml(value: LexicalValue): string {
  if (!value || typeof value !== "object" || !("root" in value) || !value.root) {
    return "";
  }

  try {
    return convertLexicalToHTML({ data: value as { root: never } });
  } catch {
    return "";
  }
}

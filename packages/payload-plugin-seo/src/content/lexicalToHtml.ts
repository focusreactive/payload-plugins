import { convertLexicalToHTML, LinkHTMLConverter } from "@payloadcms/richtext-lexical/html";
import type { HTMLConvertersFunction } from "@payloadcms/richtext-lexical/html";
import { readDocId } from "../keyphrases/docTarget";
import { isRecord } from "../utils/isRecord";

type LexicalValue = { root?: unknown } | null | undefined;

const UNRESOLVED_INTERNAL_HREF = "#";

function internalDocToHref({ linkNode }: { linkNode: { fields: { doc?: unknown } } }): string {
  const { doc } = linkNode.fields;
  if (!isRecord(doc) || typeof doc.relationTo !== "string") return UNRESOLVED_INTERNAL_HREF;

  const docId = readDocId(isRecord(doc.value) ? doc.value.id : doc.value);
  if (!docId) return UNRESOLVED_INTERNAL_HREF;

  return `/${encodeURIComponent(doc.relationTo)}/${encodeURIComponent(docId)}`;
}

const converters: HTMLConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  ...LinkHTMLConverter({ internalDocToHref }),
});

export function lexicalToHtml(value: LexicalValue): string {
  if (!value || typeof value !== "object" || !("root" in value) || !value.root) {
    return "";
  }

  try {
    return convertLexicalToHTML({ converters, data: value as { root: never } });
  } catch {
    return "";
  }
}

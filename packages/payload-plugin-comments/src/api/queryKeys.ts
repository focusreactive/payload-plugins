import type { QueryContext } from "../types";

export const QUERY_KEYS = {
  comments: {
    doc: (collectionSlug: string, docId: string) =>
      ["comments", "doc", collectionSlug, docId] as const,
    global: () => ["comments", "global"] as const,
    globalDoc: (globalSlug: string) =>
      ["comments", "global-doc", globalSlug] as const,
  },
  documentTitles: {
    doc: (collectionSlug: string, docId: string) =>
      ["document-titles", "doc", collectionSlug, docId] as const,
    global: () => ["document-titles", "global"] as const,
    globalDoc: (globalSlug: string) =>
      ["document-titles", "global-doc", globalSlug] as const,
  },
  fieldLabels: {
    doc: (collectionSlug: string, docId: string) =>
      ["field-labels", "doc", collectionSlug, docId] as const,
    global: () => ["field-labels", "global"] as const,
    globalDoc: (globalSlug: string) =>
      ["field-labels", "global-doc", globalSlug] as const,
  },
  mentionableUsers: () => ["mentionable-users"] as const,
};

export function getCommentsKey(ctx: QueryContext) {
  if (ctx.mode === "doc")
    {return QUERY_KEYS.comments.doc(ctx.collectionSlug, ctx.docId);}

  if (ctx.mode === "global-doc")
    {return QUERY_KEYS.comments.globalDoc(ctx.globalSlug);}

  return QUERY_KEYS.comments.global();
}

export function getFieldLabelsKey(ctx: QueryContext) {
  if (ctx.mode === "doc")
    {return QUERY_KEYS.fieldLabels.doc(ctx.collectionSlug, ctx.docId);}

  if (ctx.mode === "global-doc")
    {return QUERY_KEYS.fieldLabels.globalDoc(ctx.globalSlug);}

  return QUERY_KEYS.fieldLabels.global();
}

export function getDocumentTitlesKey(ctx: QueryContext) {
  if (ctx.mode === "doc")
    {return QUERY_KEYS.documentTitles.doc(ctx.collectionSlug, ctx.docId);}

  if (ctx.mode === "global-doc")
    {return QUERY_KEYS.documentTitles.globalDoc(ctx.globalSlug);}

  return QUERY_KEYS.documentTitles.global();
}

import type { QueryContext } from "../../types";

export function toQueryContext(
  mode: "document" | "global-document" | "global",
  collectionSlug: string | null | undefined,
  documentId: number | null | undefined,
  globalSlug: string | null
): QueryContext {
  if (mode === "document" && collectionSlug && documentId) {
    return {
      collectionSlug,
      docId: String(documentId),
      mode: "doc",
    };
  }

  if (mode === "global-document" && globalSlug) {
    return {
      globalSlug,
      mode: "global-doc",
    };
  }

  return { mode: "global" };
}

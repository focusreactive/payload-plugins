import type { QueryContext } from "../../types";

export function toQueryContext(
  mode: "document" | "global-document" | "global",
  collectionSlug: string | null | undefined,
  documentId: number | null | undefined,
  globalSlug: string | null,
): QueryContext {
  if (mode === "document" && collectionSlug && documentId) {
    return {
      mode: "doc",
      collectionSlug,
      docId: String(documentId),
    };
  }

  if (mode === "global-document" && globalSlug) {
    return {
      mode: "global-doc",
      globalSlug,
    };
  }

  return { mode: "global" };
}

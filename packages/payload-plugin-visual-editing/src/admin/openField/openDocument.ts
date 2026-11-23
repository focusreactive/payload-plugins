import type { VeDocument } from "../../shared/protocol.js";

type DocumentInfo = {
  collectionSlug?: string;
  globalSlug?: string;
  id?: number | string | null;
};

export function openDocumentOf({
  collectionSlug,
  globalSlug,
  id,
}: DocumentInfo): VeDocument | null {
  const slug = collectionSlug ?? globalSlug;
  if (!slug) return null;
  return {
    collectionSlug: slug,
    kind: collectionSlug ? "collection" : "global",
    ...(id !== undefined && id !== null && { docId: String(id) }),
  };
}

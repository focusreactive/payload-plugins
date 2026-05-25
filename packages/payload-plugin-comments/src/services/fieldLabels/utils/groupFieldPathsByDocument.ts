import type { Comment } from "../../../types";

type FieldPathsMap = Map<string, Map<number, Set<string>>>;

export function groupFieldPathsByDocument(comments: Comment[]) {
  const fieldPathsMap: FieldPathsMap = new Map();

  for (const { collectionSlug, documentId, fieldPath } of comments) {
    if (!collectionSlug || !documentId || !fieldPath) {continue;}

    if (!fieldPathsMap.has(collectionSlug)) {
      fieldPathsMap.set(collectionSlug, new Map());
    }

    const fieldPathsMapByDocument = fieldPathsMap.get(collectionSlug)!;

    const docId = Number(documentId);

    if (!fieldPathsMapByDocument.has(docId)) {
      fieldPathsMapByDocument.set(docId, new Set());
    }

    const fieldPaths = fieldPathsMapByDocument.get(docId)!;

    fieldPaths.add(fieldPath);
  }

  return fieldPathsMap;
}

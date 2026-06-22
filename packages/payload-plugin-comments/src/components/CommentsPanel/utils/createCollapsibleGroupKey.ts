import type { FieldPath } from "../types";

interface Props {
  collectionSlug?: string;
  documentId?: number | null;
  globalSlug?: string;
  fieldPath?: FieldPath;
}

export function createCollapsibleGroupKey({
  collectionSlug,
  documentId,
  globalSlug,
  fieldPath: fieldPathProp,
}: Props) {
  const fieldPath = fieldPathProp === null ? "__general__" : fieldPathProp;

  const fieldPathSegment = fieldPath === undefined ? "" : `-${fieldPath}`;

  if (collectionSlug && documentId) {
    return `${collectionSlug}-${documentId}${fieldPathSegment}`;
  }

  if (globalSlug) {
    return `${globalSlug}${fieldPathSegment}`;
  }

  return "";
}

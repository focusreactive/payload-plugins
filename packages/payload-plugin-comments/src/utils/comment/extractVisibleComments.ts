import type { CollectionSlug } from "payload";

import type { Comment, Mode } from "../../types";
import { filterCommentsByLocale } from "./filterCommentsByLocale";

interface Props {
  comments: Comment[];
  mode: Mode;
  collectionSlug?: CollectionSlug | null;
  documentId?: number | null;
  globalSlug?: string | null;
  currentLocale?: string | null;
}

export function extractVisibleComments({
  comments,
  mode,
  collectionSlug,
  documentId,
  globalSlug,
  currentLocale,
}: Props) {
  const localeFilteredComments = filterCommentsByLocale(
    comments,
    currentLocale
  );

  if (mode === "document" && collectionSlug && documentId) {
    return localeFilteredComments.filter(
      ({ collectionSlug: slug, documentId: id }) =>
        slug === collectionSlug && id === documentId
    );
  }

  if (mode === "global-document" && globalSlug) {
    return localeFilteredComments.filter((c) => c.globalSlug === globalSlug);
  }

  return localeFilteredComments;
}

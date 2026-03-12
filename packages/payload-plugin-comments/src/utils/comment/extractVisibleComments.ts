import type { Comment, Mode } from "../../types";
import type { CollectionSlug } from "payload";
import { filterCommentsByLocale } from "./filterCommentsByLocale";

interface Props {
  comments: Comment[];
  mode: Mode;
  collectionSlug?: CollectionSlug | null;
  documentId?: number | null;
  currentLocale?: string | null;
}

export function extractVisibleComments({ comments, mode, collectionSlug, documentId, currentLocale }: Props) {
  if (mode === "create") return [];

  const localeFilteredComments = filterCommentsByLocale(comments, currentLocale);

  return mode === "document" && collectionSlug && documentId ?
      localeFilteredComments.filter(
        ({ collectionSlug: slug, documentId: id }) => slug === collectionSlug && id === documentId,
      )
    : localeFilteredComments;
}

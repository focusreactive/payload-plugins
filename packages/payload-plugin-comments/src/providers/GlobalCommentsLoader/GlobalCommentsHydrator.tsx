"use client";

import { useEffect } from "react";
import { useComments } from "../CommentsProvider";
import type { CollectionLabels, Comment, DocumentTitles, GlobalFieldLabelRegistry, MentionUser } from "../../types";

interface Props {
  comments: Comment[];
  documentTitles: DocumentTitles;
  mentionUsers: MentionUser[];
  fieldLabels: GlobalFieldLabelRegistry;
  collectionLabels: CollectionLabels;
  loadError: boolean;
}

export function GlobalCommentsHydrator({
  comments,
  documentTitles,
  mentionUsers,
  fieldLabels,
  collectionLabels,
  loadError,
}: Props) {
  const { hydrateComments } = useComments();

  useEffect(() => {
    hydrateComments(comments, documentTitles, mentionUsers, fieldLabels, collectionLabels, loadError);
  }, [comments, documentTitles, mentionUsers, fieldLabels, collectionLabels, loadError, hydrateComments]);

  return null;
}

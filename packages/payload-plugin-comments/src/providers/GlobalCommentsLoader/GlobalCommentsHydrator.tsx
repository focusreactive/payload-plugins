"use client";

import { useEffect } from "react";
import { useComments } from "../CommentsProvider";
import type { EntityLabelsMap, Comment, DocumentTitles, GlobalFieldLabelRegistry, User } from "../../types";

interface Props {
  comments: Comment[];
  documentTitles: DocumentTitles;
  mentionUsers: User[];
  fieldLabels: GlobalFieldLabelRegistry;
  collectionLabels: EntityLabelsMap;
  globalLabels: EntityLabelsMap;
  loadError: boolean;
}

export function GlobalCommentsHydrator({
  comments,
  documentTitles,
  mentionUsers,
  fieldLabels,
  collectionLabels,
  globalLabels,
  loadError,
}: Props) {
  const { hydrateComments } = useComments();

  useEffect(() => {
    hydrateComments(comments, documentTitles, mentionUsers, fieldLabels, collectionLabels, loadError, globalLabels);
  }, [comments, documentTitles, mentionUsers, fieldLabels, collectionLabels, loadError, globalLabels, hydrateComments]);

  return null;
}

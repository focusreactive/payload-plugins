"use client";

import type { Comment, CommentMention } from "../../types";
import { useUnreadMentions } from "../../providers/UnreadMentionsProvider";

function extractRelationId(value: number | { id: number } | null | undefined) {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "id" in value) return Number(value.id);
  return null;
}

export function useIsCommentUnread(comment: Comment, currentUserId: number | null) {
  const { isMarkedRead } = useUnreadMentions();

  if (currentUserId == null) return false;
  if (comment.isResolved) return false;

  const authorId = extractRelationId(comment.author as number | { id: number });
  if (authorId === currentUserId) return false;

  const mentions = (comment.mentions ?? []) as CommentMention[];
  const isMentioned = mentions.some((m) => extractRelationId(m.user as number | { id: number } | null) === currentUserId);
  if (!isMentioned) return false;

  if (comment.isReadByCurrentUser) return false;
  if (isMarkedRead(comment.id)) return false;

  return true;
}

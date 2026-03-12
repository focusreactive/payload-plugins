"use client";

import { useState, useTransition } from "react";
import { useTranslation } from "@payloadcms/ui";
import { cn } from "../utils/general/cn";
import type { Comment } from "../types";
import { useComments } from "../providers/CommentsProvider";
import { renderCommentText } from "../utils/comment/renderCommentText";

function getAuthorName(author: Comment["author"], unknownLabel: string) {
  const defaultValue = unknownLabel;

  if (!author) return defaultValue;

  if (typeof author === "object" && "name" in author) {
    return author.name || author.email || defaultValue;
  }

  return defaultValue;
}

function getAuthorInitial(author: Comment["author"], unknownLabel: string) {
  return getAuthorName(author, unknownLabel).charAt(0).toUpperCase();
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

interface Props {
  comment: Comment;
  currentUserId: number | null;
}

export function CommentItem({ comment, currentUserId }: Props) {
  const { resolveComment, removeComment } = useComments();
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const unknownLabel = t("comments:unknownAuthor" as never);
  const authorName = getAuthorName(comment.author, unknownLabel);
  const authorInitial = getAuthorInitial(comment.author, unknownLabel);
  const isResolved = comment.isResolved ?? false;

  const authorId =
    comment.author && typeof comment.author === "object" && "id" in comment.author ? comment.author.id : null;
  const canDelete = currentUserId !== null && authorId === currentUserId;

  function handleToggleResolve() {
    setError(null);
    startTransition(async () => {
      const result = await resolveComment(comment.id, !isResolved);

      if (!result.success) setError(result.error ?? t("comments:failedToUpdate" as never));
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await removeComment(comment.id);

      if (!result.success) setError(result.error ?? t("comments:failedToDelete" as never));
    });
  }

  return (
    <div
      className={cn(
        "py-3 border-b border-(--theme-elevation-100) transition-opacity duration-150",
        isPending ? "opacity-60" : "opacity-100",
      )}>
      <div className="flex gap-2.5 items-start">
        <div className="shrink-0 w-8 h-8 rounded-full bg-(--theme-elevation-150) text-(--theme-text) flex items-center justify-center text-[13px] font-semibold">
          {authorInitial}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-[13px] text-(--theme-text)">{authorName}</span>
            <span className="text-[11px] text-(--theme-elevation-450)">{formatDate(comment.createdAt)}</span>
          </div>

          <p className="m-0 text-sm leading-normal text-(--theme-text) whitespace-pre-wrap wrap-break-word">
            {renderCommentText(comment.text, comment.mentions, currentUserId)}
          </p>

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={handleToggleResolve}
              disabled={isPending}
              className={cn(
                "border-none bg-transparent p-0 text-xs font-medium disabled:cursor-not-allowed",
                isResolved ?
                  "cursor-pointer text-(--theme-elevation-450)"
                : "cursor-pointer text-(--theme-success-500,#2d9a6a)",
              )}>
              {isResolved ? t("comments:reopen" as never) : t("comments:resolve" as never)}
            </button>

            {canDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="cursor-pointer border-none bg-transparent p-0 text-xs font-medium text-(--theme-error-500,#c0392b) disabled:cursor-not-allowed">
                {t("comments:delete" as never)}
              </button>
            )}
          </div>

          {error && <p className="text-(--theme-error-500) text-xs mt-1 m-0">{error}</p>}
        </div>
      </div>
    </div>
  );
}

"use client";

import { startTransition, useState } from "react";
import { useTranslation } from "@payloadcms/ui";
import { cn } from "../../utils/general/cn";
import type { Comment } from "../../types";
import { useComments } from "../../providers/CommentsProvider";
import { renderCommentText } from "../../utils/comment/renderCommentText";
import { resolveUsername } from "../../utils/user/resolveUsername";
import { FALLBACK_DELETED_USERNAME, FALLBACK_USERNAME } from "../../constants";
import { ToolsPanel } from "./ToolsPanel";

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
  const { resolveComment, removeComment, usernameFieldPath } = useComments();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const deletedUserLabel = t("comments:deletedUser" as never) ?? FALLBACK_DELETED_USERNAME;
  const unknownLabel = t("comments:unknownAuthor" as never) ?? FALLBACK_USERNAME;
  const narrowedAuthor = typeof comment.author === "object" ? comment.author : null;
  const authorName = resolveUsername(narrowedAuthor, usernameFieldPath, unknownLabel);
  const authorInitial = authorName.charAt(0).toUpperCase();
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
    <div className={cn("group relative py-3 border-b border-(--theme-elevation-100)")}>
      <ToolsPanel
        isResolved={isResolved}
        canDelete={canDelete}
        onDelete={handleDelete}
        onResolve={handleToggleResolve}
      />

      <div className="flex gap-2.5 items-start">
        <div className="shrink-0 w-8 h-8 rounded-full bg-(--theme-elevation-150) text-(--theme-text) flex items-center justify-center text-[13px] font-semibold">
          {authorInitial}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-(--theme-text)">{authorName}</span>
            <span className="text-[11px] text-(--theme-elevation-450)">{formatDate(comment.createdAt)}</span>
          </div>

          <p className="m-0 text-sm leading-normal text-(--theme-text) whitespace-pre-wrap wrap-break-word">
            {renderCommentText({
              text: comment.text,
              mentions: comment.mentions,
              currentUserId,
              usernameFieldPath,
              fallbackDeletedUsername: deletedUserLabel,
            })}
          </p>

          {error && <p className="text-(--theme-error-500) text-xs mt-1 m-0">{error}</p>}
        </div>
      </div>
    </div>
  );
}

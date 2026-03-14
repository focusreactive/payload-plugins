"use client";

import { startTransition } from "react";
import { useTranslation } from "@payloadcms/ui";
import { cn } from "../../utils/general/cn";
import type { Comment } from "../../types";
import { useComments } from "../../providers/CommentsProvider";
import { renderCommentText } from "../../utils/comment/renderCommentText";
import { resolveUsername } from "../../utils/user/resolveUsername";
import { FALLBACK_DELETED_USERNAME, FALLBACK_USERNAME } from "../../constants";
import { ToolsPanel } from "./ToolsPanel";
import { useRelativeDate } from "../../hooks/useRelativeDate";

interface Props {
  comment: Comment;
  currentUserId: number | null;
}

export function CommentItem({ comment, currentUserId }: Props) {
  const { resolveComment, removeComment, usernameFieldPath } = useComments();
  const { t } = useTranslation();
  const createdAtRelativeDate = useRelativeDate(comment.createdAt);

  const deletedUserLabel = t("comments:deletedUser" as never) ?? FALLBACK_DELETED_USERNAME;
  const unknownLabel = t("comments:unknownAuthor" as never) ?? FALLBACK_USERNAME;
  const narrowedAuthor = typeof comment.author === "object" ? comment.author : null;
  const authorName = resolveUsername(narrowedAuthor, usernameFieldPath, unknownLabel);
  const authorInitial = authorName.charAt(0).toUpperCase();
  const isResolved = comment.isResolved ?? false;

  const authorId =
    comment.author && typeof comment.author === "object" && "id" in comment.author ? comment.author.id : null;
  const canDelete = currentUserId !== null && authorId === currentUserId;

  const handleToggleResolve = () => {
    startTransition(async () => {
      await resolveComment(comment.id, !isResolved);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await removeComment(comment.id);
    });
  };

  return (
    <div className={cn("group relative py-3")}>
      <ToolsPanel
        isResolved={isResolved}
        canDelete={canDelete}
        onDelete={handleDelete}
        onResolve={handleToggleResolve}
      />

      <div className="flex gap-2.5 items-start">
        <div className="shrink-0 w-9 h-9 rounded-full bg-(--theme-elevation-150) text-(--theme-text) flex items-center justify-center text-[14px] font-semibold">
          {authorInitial}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-[14px] text-(--theme-text)">{authorName}</span>
            <span className="text-[11px] text-(--theme-elevation-450)">{createdAtRelativeDate}</span>
          </div>

          <p className="m-0 text-[13px] leading-normal text-(--theme-text) whitespace-pre-wrap wrap-break-word">
            {renderCommentText({
              text: comment.text,
              mentions: comment.mentions,
              currentUserId,
              usernameFieldPath,
              fallbackDeletedUsername: deletedUserLabel,
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useTranslation } from "@payloadcms/ui";
import { CircleCheck } from "lucide-react";
import { startTransition, useRef } from "react";

import { FALLBACK_DELETED_USERNAME, FALLBACK_USERNAME } from "../../constants";
import { useRelativeDate } from "../../hooks/useRelativeDate";
import { useComments } from "../../providers/CommentsProvider";
import type { Comment } from "../../types";
import { renderCommentText } from "../../utils/comment/renderCommentText";
import { cn } from "../../utils/general/cn";
import { resolveUsername } from "../../utils/user/resolveUsername";
import { Avatar } from "../Avatar";
import { StrikethoroughOverlay } from "./StrikethoroughOverlay";
import { ToolsPanel } from "./ToolsPanel";

interface Props {
  comment: Comment;
  currentUserId: number | null;
}

export function CommentItem({ comment, currentUserId }: Props) {
  const { resolveComment, removeComment, usernameFieldPath } = useComments();
  const { t } = useTranslation();
  const createdAtRelativeDate = useRelativeDate(comment.createdAt);

  const contentRef = useRef<HTMLParagraphElement>(null);

  const deletedUserLabel =
    t("comments:deletedUser" as never) ?? FALLBACK_DELETED_USERNAME;
  const mentionDeletedSuffix =
    t("comments:mentionDeletedSuffix" as never) ?? "(deleted)";
  const unknownLabel =
    t("comments:unknownAuthor" as never) ?? FALLBACK_USERNAME;
  const narrowedAuthor =
    typeof comment.author === "object" ? comment.author : null;
  const authorName = resolveUsername(
    narrowedAuthor,
    usernameFieldPath,
    unknownLabel
  );

  const isResolved = comment.isResolved ?? false;
  const authorId =
    comment.author &&
    typeof comment.author === "object" &&
    "id" in comment.author
      ? comment.author.id
      : null;
  const canDelete = currentUserId !== null && authorId === currentUserId;

  const renderedText = renderCommentText({
    currentUserId,
    fallbackDeletedUsername: deletedUserLabel,
    mentionDeletedSuffix,
    mentions: comment.mentions,
    text: comment.text,
    usernameFieldPath,
  });

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
    <div className={cn("group relative")}>
      <div className="flex gap-2.5 items-start">
        <Avatar
          user={narrowedAuthor}
          usernameFieldPath={usernameFieldPath}
          fallbackName={unknownLabel}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-[13px] text-(--theme-text) truncate">
              {authorName}
            </span>

            {isResolved && (
              <CircleCheck
                size={14}
                className="text-green-500 shrink-0"
                aria-label={t("comments:resolved" as never)}
              />
            )}

            <span className="text-[11px] text-(--theme-elevation-450) shrink-0">
              {createdAtRelativeDate}
            </span>
          </div>

          <p
            ref={contentRef}
            className={cn(
              "relative m-0 text-[13px] text-(--theme-text) leading-normal whitespace-pre-wrap wrap-break-word transition-opacity motion-reduce:transition-none",
              isResolved && "opacity-60"
            )}
          >
            {isResolved && (
              <del
                style={{ textDecoration: "none" }}
                dateTime={comment.resolvedAt ?? undefined}
              >
                {renderedText}
              </del>
            )}
            {!isResolved && renderedText}

            <StrikethoroughOverlay
              isResolved={isResolved}
              contentRef={contentRef}
            />
          </p>
        </div>
      </div>

      <ToolsPanel
        commentId={comment.id}
        isResolved={isResolved}
        canDelete={canDelete}
        onDelete={handleDelete}
        onResolve={handleToggleResolve}
      />
    </div>
  );
}

"use client";

import type { Comment } from "../../../types";
import { useComments } from "../../../providers/CommentsProvider";
import { groupCommentsByFieldPath } from "../utils/groupCommentsByFieldPath";
import { FieldGroupSection } from "./FieldGroupSection";
import { cn } from "../../../utils/general/cn";

interface Props {
  comments: Comment[];
  userId: number | null;
  className: string;
}

export function DocumentView({ comments, userId, className }: Props) {
  const { collectionSlug, documentId } = useComments();

  const fields = groupCommentsByFieldPath(comments);

  return (
    <div className={cn(className, "flex flex-col gap-3 pt-4")}>
      <FieldGroupSection
        fields={fields}
        userId={userId}
        collectionSlug={collectionSlug ?? undefined}
        documentId={documentId ?? undefined}
      />
    </div>
  );
}

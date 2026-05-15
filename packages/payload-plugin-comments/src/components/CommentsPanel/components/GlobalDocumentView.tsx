"use client";

import { useComments } from "../../../providers/CommentsProvider";
import type { Comment } from "../../../types";
import { groupCommentsByFieldPath } from "../utils/groupCommentsByFieldPath";
import { FieldGroupSection } from "./FieldGroupSection";

interface Props {
  comments: Comment[];
  userId: number | null;
  className: string;
}

export function GlobalDocumentView({ comments, userId, className }: Props) {
  const { globalSlug } = useComments();

  const fields = groupCommentsByFieldPath(comments);

  return (
    <div className={className}>
      <FieldGroupSection
        fields={fields}
        userId={userId}
        globalSlug={globalSlug ?? undefined}
      />
    </div>
  );
}

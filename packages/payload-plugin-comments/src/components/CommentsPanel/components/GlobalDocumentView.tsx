"use client";

import { useTranslation } from "@payloadcms/ui";
import type { Comment } from "../../../types";
import { useComments } from "../../../providers/CommentsProvider";
import { groupCommentsByFieldPath } from "../utils/groupCommentsByFieldPath";
import { resolveLabel } from "../utils/resolveLabel";
import { FILTER_NO_COMMENTS_KEYS } from "../constants";
import { FieldGroupSection } from "./FieldGroupSection";

interface Props {
  comments: Comment[];
  userId: number | null;
  className: string;
}

export function GlobalDocumentView({ comments, userId, className }: Props) {
  const { t } = useTranslation();
  const { fieldLabelRegistry, globalSlug, filter } = useComments();

  const fields = groupCommentsByFieldPath(comments);

  return (
    <div className={className}>
      {comments.length === 0 && (
        <p className="text-(--theme-elevation-450) text-[13px] text-center py-6 m-0">
          {t(FILTER_NO_COMMENTS_KEYS[filter] as never)}
        </p>
      )}

      <FieldGroupSection
        fields={fields}
        userId={userId}
        labelResolver={(fp) =>
          globalSlug != null ? resolveLabel(fieldLabelRegistry, globalSlug, 0, fp) : fp
        }
        generalGroupKey="g::"
        fieldGroupKeyPrefix="f::"
      />
    </div>
  );
}

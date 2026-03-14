"use client";

import { useTranslation } from "@payloadcms/ui";
import type { Comment } from "../../../types/comment";
import { CollapsibleGroup } from "./CollapsibleGroup";
import { CommentItem } from "../../CommentItem";
import { AddCommentForm } from "../../AddCommentForm";
import { createCollapsibleGroupKey } from "../utils/createCollapsibleGroupKey";
import { resolveFieldLabel } from "../utils/resolveFieldLabel";
import { useComments } from "../../../providers/CommentsProvider";

interface Props {
  fields: Map<string | null, Comment[]>;
  userId: number | null;
  collectionSlug?: string;
  documentId?: number;
  globalSlug?: string;
}

export function FieldGroupSection({ fields, userId, collectionSlug, documentId, globalSlug }: Props) {
  const { t } = useTranslation();
  const { fieldLabelRegistry } = useComments();

  const generalComments = fields.get(null) ?? [];
  const fieldEntries = [...fields.entries()].filter((entry): entry is [string, Comment[]] => entry[0] !== null);

  return (
    <>
      <CollapsibleGroup
        groupKey={createCollapsibleGroupKey({ collectionSlug, documentId, globalSlug, fieldPath: null })}
        label={t("comments:general" as never)}
        count={generalComments.filter((c) => !c.isResolved).length}
        level="field">
        <div>
          {generalComments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} currentUserId={userId} />
          ))}

          <AddCommentForm
            fieldPath={null}
            collectionSlug={collectionSlug}
            documentId={documentId}
            globalSlug={globalSlug}
          />
        </div>
      </CollapsibleGroup>

      {fieldEntries.map(([fieldPath, fieldComments]) => (
        <CollapsibleGroup
          key={fieldPath}
          groupKey={createCollapsibleGroupKey({ collectionSlug, documentId, globalSlug, fieldPath })}
          label={resolveFieldLabel({ registry: fieldLabelRegistry, collectionSlug, documentId, globalSlug, fieldPath })}
          count={fieldComments.filter((c) => !c.isResolved).length}
          level="field">
          <div data-field-path={fieldPath}>
            {fieldComments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} currentUserId={userId} />
            ))}

            <AddCommentForm
              fieldPath={fieldPath}
              collectionSlug={collectionSlug}
              documentId={documentId}
              globalSlug={globalSlug}
            />
          </div>
        </CollapsibleGroup>
      ))}
    </>
  );
}

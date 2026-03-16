"use client";

import { useTranslation } from "@payloadcms/ui";
import type { Comment } from "../../../types/comment";
import { CollapsibleGroup } from "./CollapsibleGroup";
import { CommentItem } from "../../CommentItem";
import { createCollapsibleGroupKey } from "../utils/createCollapsibleGroupKey";
import { resolveFieldLabel } from "../utils/resolveFieldLabel";
import { useComments } from "../../../providers/CommentsProvider";
import { CommentEditor } from "../../CommentEditor";

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
        level="field">
        <div className="flex flex-col gap-3">
          {generalComments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} currentUserId={userId} />
          ))}

          <CommentEditor
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
          level="field">
          <div className="flex flex-col gap-3" data-field-path={fieldPath}>
            {fieldComments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} currentUserId={userId} />
            ))}

            <CommentEditor
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

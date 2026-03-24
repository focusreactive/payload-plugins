"use client";

import { useRef, useEffect } from "react";
import { useTranslation } from "@payloadcms/ui";
import type { Comment } from "../../../types/comment";
import { CollapsibleGroup } from "./CollapsibleGroup";
import { CommentItem } from "../../CommentItem";
import { createCollapsibleGroupKey } from "../utils/createCollapsibleGroupKey";
import { resolveFieldLabel } from "../utils/resolveFieldLabel";
import { useComments } from "../../../providers/CommentsProvider";
import { CommentEditor } from "../../CommentEditor";
import type { CommentEditorHandle } from "../../CommentEditor";
import { useCommentsDrawer } from "../../../providers/CommentsDrawerProvider";
import { useFieldLabelsQuery } from "../../../api/queries/useFieldLabelsQuery";

interface Props {
  fields: Map<string | null, Comment[]>;
  userId: number | null;
  collectionSlug?: string;
  documentId?: number;
  globalSlug?: string;
}

export function FieldGroupSection({ fields, userId, collectionSlug, documentId, globalSlug }: Props) {
  const { t } = useTranslation();
  const { queryContext } = useComments();
  const { data: fieldLabelRegistry = {} } = useFieldLabelsQuery(queryContext);
  const { pendingField, clearPendingField } = useCommentsDrawer();
  const editorRef = useRef<CommentEditorHandle | null>(null);

  const generalComments = fields.get(null) ?? [];
  const fieldEntries = [...fields.entries()].filter((entry): entry is [string, Comment[]] => entry[0] !== null);

  const allEntries: [string, Comment[]][] = [
    ...fieldEntries,
    ...(pendingField && !fields.has(pendingField.path) ? [[pendingField.path, []] as [string, Comment[]]] : []),
  ];

  useEffect(() => {
    if (!pendingField) return;

    const id = setTimeout(() => editorRef.current?.focus(), 300);

    return () => clearTimeout(id);
  }, [pendingField]);

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

      {allEntries.map(([fieldPath, fieldComments]) => {
        const isPending = pendingField?.path === fieldPath;

        return (
          <CollapsibleGroup
            key={fieldPath}
            groupKey={createCollapsibleGroupKey({ collectionSlug, documentId, globalSlug, fieldPath })}
            label={
              isPending ?
                pendingField.label
              : resolveFieldLabel({ registry: fieldLabelRegistry, collectionSlug, documentId, globalSlug, fieldPath })
            }
            level="field"
            forceExpanded={isPending}>
            <div className="flex flex-col gap-3" data-field-path={fieldPath}>
              {fieldComments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} currentUserId={userId} />
              ))}

              <CommentEditor
                ref={isPending ? editorRef : undefined}
                onSuccessAddComment={isPending ? clearPendingField : undefined}
                fieldPath={fieldPath}
                collectionSlug={collectionSlug}
                documentId={documentId}
                globalSlug={globalSlug}
              />
            </div>
          </CollapsibleGroup>
        );
      })}
    </>
  );
}

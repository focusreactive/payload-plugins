"use client";

import { useTranslation } from "@payloadcms/ui";
import { useRef, useEffect } from "react";

import { useFieldLabelsQuery } from "../../../api/queries/useFieldLabelsQuery";
import { DRAWER_OPENING_TIME } from "../../../constants";
import { useCommentsDrawer } from "../../../providers/CommentsDrawerProvider";
import { useComments } from "../../../providers/CommentsProvider";
import type { Comment } from "../../../types/comment";
import { CommentEditor } from "../../CommentEditor";
import type { CommentEditorHandle } from "../../CommentEditor";
import { CommentItem } from "../../CommentItem";
import { createCollapsibleGroupKey } from "../utils/createCollapsibleGroupKey";
import { resolveFieldLabel } from "../utils/resolveFieldLabel";
import { CollapsibleGroup } from './CollapsibleGroup';
import type { CollapsibleGroupHandle } from './CollapsibleGroup';

interface Props {
  fields: Map<string | null, Comment[]>;
  userId: number | null;
  collectionSlug?: string;
  documentId?: number;
  globalSlug?: string;
}

export function FieldGroupSection({
  fields,
  userId,
  collectionSlug,
  documentId,
  globalSlug,
}: Props) {
  const { t } = useTranslation();
  const { queryContext } = useComments();
  const { data: fieldLabelRegistry = {} } = useFieldLabelsQuery(queryContext);
  const { pendingField } = useCommentsDrawer();
  const editorRef = useRef<CommentEditorHandle | null>(null);
  const pendingFieldCollapsibleGroup = useRef<CollapsibleGroupHandle | null>(
    null
  );

  const generalComments = fields.get(null) ?? [];
  const fieldEntries = [...fields.entries()].filter(
    (entry): entry is [string, Comment[]] => entry[0] !== null
  );

  const allEntries: [string, Comment[]][] = [
    ...fieldEntries,
    ...(pendingField && !fields.has(pendingField.path)
      ? [[pendingField.path, []] as [string, Comment[]]]
      : []),
  ];

  useEffect(() => {
    if (!pendingField) {return;}

    pendingFieldCollapsibleGroup.current?.open();

    const id = setTimeout(
      () => editorRef.current?.focus(),
      DRAWER_OPENING_TIME
    );

    return () => clearTimeout(id);
  }, [pendingField]);

  return (
    <>
      <CollapsibleGroup
        groupKey={createCollapsibleGroupKey({
          collectionSlug,
          documentId,
          fieldPath: null,
          globalSlug,
        })}
        label={t("comments:general" as never)}
        level="field"
      >
        <div className="flex flex-col gap-3">
          {generalComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={userId}
            />
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
            fieldPath={fieldPath}
            ref={isPending ? pendingFieldCollapsibleGroup : undefined}
            groupKey={createCollapsibleGroupKey({
              collectionSlug,
              documentId,
              fieldPath,
              globalSlug,
            })}
            label={
              isPending
                ? pendingField.label
                : resolveFieldLabel({
                    collectionSlug,
                    documentId,
                    fieldPath,
                    globalSlug,
                    registry: fieldLabelRegistry,
                  })
            }
            level="field"
          >
            <div className="flex flex-col gap-3">
              {fieldComments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={userId}
                />
              ))}

              <CommentEditor
                ref={isPending ? editorRef : undefined}
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

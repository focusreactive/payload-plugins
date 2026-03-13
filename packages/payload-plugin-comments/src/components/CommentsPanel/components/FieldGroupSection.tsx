"use client";

import { useTranslation } from "@payloadcms/ui";
import type { Comment } from "../../../types";
import { CollapsibleGroup } from "./CollapsibleGroup";
import { CommentItem } from "../../CommentItem";
import { AddCommentForm } from "../../AddCommentForm";

interface Props {
  fields: Map<string | null, Comment[]>;
  userId: number | null;
  collectionSlug?: string;
  documentId?: number;
  generalGroupKey: string;
  fieldGroupKeyPrefix: string;
  labelResolver: (fieldPath: string) => string;
}

export function FieldGroupSection({
  fields,
  userId,
  collectionSlug,
  documentId,
  generalGroupKey,
  fieldGroupKeyPrefix,
  labelResolver,
}: Props) {
  const { t } = useTranslation();
  const generalComments = fields.get(null) ?? [];
  const fieldEntries = [...fields.entries()].filter((entry): entry is [string, Comment[]] => entry[0] !== null);

  return (
    <>
      <CollapsibleGroup
        groupKey={generalGroupKey}
        label={t("comments:general" as never)}
        count={generalComments.filter((c) => !c.isResolved).length}
        level="field">
        <div data-field-path="__document__">
          {generalComments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} currentUserId={userId} />
          ))}

          <AddCommentForm fieldPath={null} collectionSlug={collectionSlug} documentId={documentId} />
        </div>
      </CollapsibleGroup>

      {fieldEntries.map(([fieldPath, fieldComments]) => (
        <CollapsibleGroup
          key={fieldPath}
          groupKey={`${fieldGroupKeyPrefix}${fieldPath}`}
          label={labelResolver(fieldPath)}
          count={fieldComments.filter((c) => !c.isResolved).length}
          level="field">
          <div data-field-path={fieldPath}>
            {fieldComments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} currentUserId={userId} />
            ))}

            <AddCommentForm fieldPath={fieldPath} collectionSlug={collectionSlug} documentId={documentId} />
          </div>
        </CollapsibleGroup>
      ))}
    </>
  );
}

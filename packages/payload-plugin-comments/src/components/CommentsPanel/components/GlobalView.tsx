"use client";

import { useLocale } from "@payloadcms/ui";
import type { Comment } from "../../../types/comment";
import { useComments } from "../../../providers/CommentsProvider";
import { useDocumentTitlesQuery } from "../../../api/queries/useDocumentTitlesQuery";
import { groupCommentsGlobally } from "../utils/groupCommentsGlobally";
import { resolveEntityLabel } from "../utils/resolveEntityLabel";
import { CollapsibleGroup } from "./CollapsibleGroup";
import { FieldGroupSection } from "./FieldGroupSection";
import { createCollapsibleGroupKey } from "../utils/createCollapsibleGroupKey";

interface Props {
  comments: Comment[];
  userId: number | null;
  className: string;
}

export function GlobalView({ comments, userId, className }: Props) {
  const { collectionLabels, globalLabels, queryContext } = useComments();
  const { data: documentTitles = {} } = useDocumentTitlesQuery(queryContext);
  const { code: locale } = useLocale();
  const groupedComments = groupCommentsGlobally(comments);

  return (
    <div className={className}>
      {groupedComments.map((entry) => {
        if (entry.type === "collection") {
          const { slug, docs } = entry;

          return (
            <CollapsibleGroup
              key={slug}
              groupKey={slug}
              label={resolveEntityLabel(collectionLabels[slug], locale, slug)}
              level="collection">
              {[...docs.entries()].map(([docId, fields]) => {
                const title = documentTitles[slug]?.[String(docId)] ?? String(docId);
                const documentId = Number(docId);

                return (
                  <CollapsibleGroup
                    key={docId}
                    groupKey={createCollapsibleGroupKey({ collectionSlug: slug, documentId })}
                    label={title}
                    level="document">
                    <FieldGroupSection fields={fields} userId={userId} collectionSlug={slug} documentId={documentId} />
                  </CollapsibleGroup>
                );
              })}
            </CollapsibleGroup>
          );
        }

        const { slug, fields } = entry;

        return (
          <CollapsibleGroup
            key={slug}
            groupKey={slug}
            label={resolveEntityLabel(globalLabels[slug], locale, slug)}
            level="collection">
            <FieldGroupSection fields={fields} userId={userId} globalSlug={slug} />
          </CollapsibleGroup>
        );
      })}
    </div>
  );
}

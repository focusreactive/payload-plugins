"use client";

import { useLocale, useTranslation } from "@payloadcms/ui";
import type { Comment } from "../../../types/comment";
import { useComments } from "../../../providers/CommentsProvider";
import { groupCommentsGlobally } from "../utils/groupCommentsGlobally";
import { resolveEntityLabel } from "../utils/resolveEntityLabel";
import { CollapsibleGroup } from "./CollapsibleGroup";
import { FILTER_NO_COMMENTS_KEYS } from "../constants";
import { FieldGroupSection } from "./FieldGroupSection";
import { createCollapsibleGroupKey } from "../utils/createCollapsibleGroupKey";

interface Props {
  comments: Comment[];
  userId: number | null;
  className: string;
}

export function GlobalView({ comments, userId, className }: Props) {
  const { t } = useTranslation();
  const { documentTitles, filter, collectionLabels, globalLabels } = useComments();
  const { code: locale } = useLocale();
  const groupedComments = groupCommentsGlobally(comments);

  return (
    <div className={className}>
      {comments.length === 0 && (
        <p className="text-(--theme-elevation-450) text-[13px] text-center py-6 m-0">
          {t(FILTER_NO_COMMENTS_KEYS[filter] as never)}
        </p>
      )}

      {groupedComments.map((entry) => {
        if (entry.type === "collection") {
          const { slug, docs } = entry;
          const slugOpenCount = [...docs.values()]
            .flatMap((fields) => [...fields.values()].flat())
            .filter((c) => !c.isResolved).length;

          return (
            <CollapsibleGroup
              key={slug}
              groupKey={slug}
              label={resolveEntityLabel(collectionLabels[slug], locale, slug)}
              count={slugOpenCount}
              level="collection">
              {[...docs.entries()].map(([docId, fields]) => {
                const title = documentTitles[slug]?.[String(docId)] ?? String(docId);
                const docOpenCount = [...fields.values()].flat().filter((c) => !c.isResolved).length;
                const documentId = Number(docId);

                return (
                  <CollapsibleGroup
                    key={docId}
                    groupKey={createCollapsibleGroupKey({ collectionSlug: slug, documentId })}
                    label={title}
                    count={docOpenCount}
                    level="document">
                    <FieldGroupSection fields={fields} userId={userId} collectionSlug={slug} documentId={documentId} />
                  </CollapsibleGroup>
                );
              })}
            </CollapsibleGroup>
          );
        }

        const { slug, fields } = entry;
        const openCount = [...fields.values()].flat().filter((c) => !c.isResolved).length;

        return (
          <CollapsibleGroup
            key={slug}
            groupKey={slug}
            label={resolveEntityLabel(globalLabels[slug], locale, slug)}
            count={openCount}
            level="collection">
            <FieldGroupSection fields={fields} userId={userId} globalSlug={slug} />
          </CollapsibleGroup>
        );
      })}
    </div>
  );
}

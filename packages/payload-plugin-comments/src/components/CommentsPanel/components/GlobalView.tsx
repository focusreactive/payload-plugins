"use client";

import { useLocale, useTranslation } from "@payloadcms/ui";
import type { Comment } from "../../../types";
import { useComments } from "../../../providers/CommentsProvider";
import { groupCommentsGlobally } from "../utils/groupCommentsGlobally";
import { resolveLabel } from "../utils/resolveLabel";
import { resolveCollectionLabel } from "../utils/resolveCollectionLabel";
import { CollapsibleGroup } from "./CollapsibleGroup";
import { FILTER_NO_COMMENTS_KEYS } from "../constants";
import { FieldGroupSection } from "./FieldGroupSection";
import type { FieldPath } from "../types";

interface Props {
  comments: Comment[];
  userId: number | null;
  className: string;
}

export function GlobalView({ comments, userId, className }: Props) {
  const { t } = useTranslation();
  const { documentTitles, fieldLabelRegistry, filter, collectionLabels, globalLabels } = useComments();
  const { code: locale } = useLocale();
  const { collections: groupedCollections, globals: groupedGlobals } = groupCommentsGlobally(comments);

  return (
    <div className={className}>
      {comments.length === 0 && (
        <p className="text-(--theme-elevation-450) text-[13px] text-center py-6 m-0">
          {t(FILTER_NO_COMMENTS_KEYS[filter] as never)}
        </p>
      )}

      {/* Collection comments */}
      {[...groupedCollections.entries()].map(([slug, docs]) => {
        const slugOpenCount = [...docs.values()]
          .flatMap((fields) => [...fields.values()].flat())
          .filter((c) => !c.isResolved).length;

        return (
          <CollapsibleGroup
            key={slug}
            groupKey={`c:${slug}`}
            label={resolveCollectionLabel(collectionLabels[slug], locale, slug)}
            count={slugOpenCount}
            level="collection">
            {[...docs.entries()].map(([docId, fields]) => {
              const title = documentTitles[slug]?.[String(docId)] ?? String(docId);
              const docOpenCount = [...fields.values()].flat().filter((c) => !c.isResolved).length;
              const documentId = Number(docId);

              return (
                <CollapsibleGroup
                  key={docId}
                  groupKey={`d:${slug}:${docId}`}
                  label={title}
                  count={docOpenCount}
                  level="document">
                  <FieldGroupSection
                    fields={fields}
                    userId={userId}
                    collectionSlug={slug}
                    documentId={documentId}
                    generalGroupKey={`g:${slug}:${docId}`}
                    fieldGroupKeyPrefix={`f:${slug}:${docId}:`}
                    labelResolver={(fp) => resolveLabel(fieldLabelRegistry, slug, Number(docId), fp)}
                  />
                </CollapsibleGroup>
              );
            })}
          </CollapsibleGroup>
        );
      })}

      {/* Global comments */}
      {[...groupedGlobals.entries()].map(([slug, fields]) => {
        const openCount = [...fields.values()].flat().filter((c) => !c.isResolved).length;
        const rawLabel = globalLabels[slug];
        const label =
          typeof rawLabel === "string" ? rawLabel
          : typeof rawLabel === "object" && rawLabel !== null ?
            (rawLabel as Record<string, string>)[locale] ??
            (rawLabel as Record<string, string>)["en"] ??
            slug
          : slug;

        return (
          <CollapsibleGroup
            key={slug}
            groupKey={`global:${slug}`}
            label={label}
            count={openCount}
            level="collection">
            <FieldGroupSection
              fields={fields as Map<FieldPath, Comment[]>}
              userId={userId}
              generalGroupKey={`g:global:${slug}`}
              fieldGroupKeyPrefix={`f:global:${slug}:`}
              labelResolver={(fp) => resolveLabel(fieldLabelRegistry, slug, 0, fp)}
            />
          </CollapsibleGroup>
        );
      })}
    </div>
  );
}

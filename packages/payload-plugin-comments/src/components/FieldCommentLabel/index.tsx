"use client";

import { useTranslation, useLocale, useAuth } from "@payloadcms/ui";
import { MessageSquareIcon, MessageSquarePlus } from "lucide-react";
import { useComments } from "../../providers/CommentsProvider";
import type { FieldLabelClientProps } from "payload";
import type { Label } from "./types";
import { resolveLabel } from "./utils/resolveLabel";
import { excludeComments } from "./utils/exludeComments";
import { useStablePath } from "./hooks/useStablePath";
import { useFieldBreadcrumb } from "./hooks/useFieldBreadcrumb";
import { useCommentsDrawer } from "../../providers/CommentsDrawerProvider";
import { IconButton } from "../IconButton";
import { resolveFieldLabel } from "../CommentsPanel/utils/resolveFieldLabel";
import { useCommentsQuery } from "../../api/queries/useCommentsQuery";
import { useFieldLabelsQuery } from "../../api/queries/useFieldLabelsQuery";
import { filterCommentsByLocale } from "../../utils/comment/filterCommentsByLocale";
import { applyCommentFilters } from "../../utils/comment/applyCommentFilters";
import { useCommentsFilter } from "../../providers/CommentsFilterProvider";

interface Props extends FieldLabelClientProps {
  field: FieldLabelClientProps["field"] & {
    label?: Label;
    required?: boolean;
  };
}

export function FieldCommentLabel({ field, htmlFor, path: fieldPath }: Props) {
  const { label, required } = field;

  const { t } = useTranslation();
  const { code: locale } = useLocale();
  const { user } = useAuth();

  const { openForField } = useCommentsDrawer();
  const { mode, queryContext, collectionSlug, documentId, globalSlug } = useComments();
  const { data: allComments = [] } = useCommentsQuery(queryContext);
  const { data: fieldLabelRegistry } = useFieldLabelsQuery(queryContext);
  const { filters } = useCommentsFilter();

  const resolvedLabel = resolveLabel(label, locale);
  const stablePath = useStablePath(fieldPath ?? "");

  const userId = (user?.id as number) ?? null;

  const localeFiltered = filterCommentsByLocale(allComments, locale);
  const visibleComments = applyCommentFilters(localeFiltered, filters, userId);
  const fieldComments = excludeComments(visibleComments, stablePath || undefined, locale);
  const openCommentsCount = fieldComments.length;

  const clientBreadcrumb = useFieldBreadcrumb(fieldPath, resolvedLabel, collectionSlug, globalSlug);

  const handleOpenDrawer = () => {
    if (!stablePath) return;

    const serverLabel = resolveFieldLabel({
      registry: fieldLabelRegistry ?? {},
      collectionSlug: collectionSlug ?? undefined,
      documentId: documentId ?? undefined,
      globalSlug: globalSlug ?? undefined,
      fieldPath: stablePath,
    });

    openForField(stablePath, serverLabel !== stablePath ? serverLabel : clientBreadcrumb);
  };

  if (!resolvedLabel) return null;

  return (
    <div className="flex items-center gap-1.5 pb-1.25 group">
      <label className="field-label p-0" htmlFor={htmlFor}>
        {resolvedLabel}

        {required && <span className="required">*</span>}
      </label>

      {fieldPath && (mode === "document" || mode === "global-document") && (
        <div className="relative flex items-center">
          {!!openCommentsCount && (
            <IconButton
              className="w-auto px-1 gap-1 text-[12px] font-semibold leading-none"
              size="sm"
              title={t("comments:openComments" as never, { count: openCommentsCount })}
              onClick={handleOpenDrawer}>
              <MessageSquareIcon size={14} />

              {openCommentsCount}
            </IconButton>
          )}
          {!openCommentsCount && (
            <IconButton
              className={"opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity"}
              size="sm"
              title={t("comments:add" as never)}
              onClick={handleOpenDrawer}>
              <MessageSquarePlus size={14} />
            </IconButton>
          )}
        </div>
      )}
    </div>
  );
}

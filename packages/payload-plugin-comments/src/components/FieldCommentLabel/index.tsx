"use client";

import {
  useTranslation,
  useLocale,
  useAuth,
  FieldLabel,
  useForm,
  useEditDepth,
} from "@payloadcms/ui";
import { MessageSquareIcon, MessageSquarePlus } from "lucide-react";
import type { FieldLabelClientProps } from "payload";

import { useCommentsQuery } from "../../api/queries/useCommentsQuery";
import { useFieldLabelsQuery } from "../../api/queries/useFieldLabelsQuery";
import { useCommentsDrawer } from "../../providers/CommentsDrawerProvider";
import { useCommentsFilter } from "../../providers/CommentsFilterProvider";
import { useComments } from "../../providers/CommentsProvider";
import { applyCommentFilters } from "../../utils/comment/applyCommentFilters";
import { filterCommentsByLocale } from "../../utils/comment/filterCommentsByLocale";
import { resolveFieldLabel } from "../CommentsPanel/utils/resolveFieldLabel";
import { IconButton } from "../IconButton";
import { useFieldBreadcrumb } from "./hooks/useFieldBreadcrumb";
import { useStablePath } from "./hooks/useStablePath";
import type { Label } from "./types";
import { excludeComments } from "./utils/exludeComments";
import { resolveFieldLabelAs } from "./utils/resolveFieldLabelAs";
import { resolveLabel } from "./utils/resolveLabel";

interface Props extends FieldLabelClientProps {
  field: FieldLabelClientProps["field"] & {
    label?: Label;
    required?: boolean;
    localized?: boolean;
  };
}

export function FieldCommentLabel({ field, path: fieldPath }: Props) {
  const { label, required } = field;

  const { uuid } = useForm();
  const editDepth = useEditDepth();

  const as = resolveFieldLabelAs(field.type);
  const localized = field.type === "group" ? false : (field.localized ?? false);
  const htmlFor = fieldPath
    ? `field-${fieldPath.replaceAll(/\./g, "__")}${editDepth > 1 ? `-${editDepth}` : ""}${uuid ? `-${uuid}` : ""}`
    : undefined;

  const { t } = useTranslation();
  const { code: locale } = useLocale();
  const { user } = useAuth();

  const { openForField } = useCommentsDrawer();
  const { mode, queryContext, collectionSlug, documentId, globalSlug } =
    useComments();
  const { data: allComments = [] } = useCommentsQuery(queryContext);
  const { data: fieldLabelRegistry } = useFieldLabelsQuery(queryContext);
  const { filters } = useCommentsFilter();

  const resolvedLabel = resolveLabel(label, locale);
  const stablePath = useStablePath(fieldPath ?? "");

  const userId = (user?.id as number) ?? null;

  const localeFiltered = filterCommentsByLocale(allComments, locale);
  const visibleComments = applyCommentFilters(localeFiltered, filters, userId);
  const fieldComments = excludeComments(
    visibleComments,
    stablePath || undefined,
    locale
  );
  const openCommentsCount = fieldComments.length;

  const clientBreadcrumb = useFieldBreadcrumb(
    fieldPath,
    resolvedLabel,
    collectionSlug,
    globalSlug
  );

  const handleOpenDrawer = () => {
    if (!stablePath) {return;}

    const serverLabel = resolveFieldLabel({
      collectionSlug: collectionSlug ?? undefined,
      documentId: documentId ?? undefined,
      fieldPath: stablePath,
      globalSlug: globalSlug ?? undefined,
      registry: fieldLabelRegistry ?? {},
    });

    openForField(
      stablePath,
      serverLabel !== stablePath ? serverLabel : clientBreadcrumb
    );
  };

  if (!resolvedLabel) {return null;}

  return (
    <div className="flex items-center gap-1.5 group">
      <FieldLabel
        htmlFor={htmlFor}
        label={label as string | Record<string, string>}
        required={required}
        path={fieldPath}
        as={as}
        hideLocale={false}
        localized={localized}
        unstyled={false}
      />

      {fieldPath && (mode === "document" || mode === "global-document") && (
        <div className="relative flex items-center">
          {!!openCommentsCount && (
            <IconButton
              className="w-auto px-1 gap-1 text-[12px] font-semibold leading-none [&_svg]:opacity-100"
              size="sm"
              title={t("comments:openComments" as never, {
                count: openCommentsCount,
              })}
              onClick={handleOpenDrawer}
            >
              <MessageSquareIcon size={14} />

              {openCommentsCount}
            </IconButton>
          )}
          {!openCommentsCount && (
            <IconButton
              className={
                "opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity [&_svg]:opacity-100"
              }
              size="sm"
              title={t("comments:add" as never)}
              onClick={handleOpenDrawer}
            >
              <MessageSquarePlus size={14} />
            </IconButton>
          )}
        </div>
      )}
    </div>
  );
}

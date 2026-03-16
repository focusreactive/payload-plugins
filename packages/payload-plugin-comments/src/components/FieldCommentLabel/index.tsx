"use client";

import { useState } from "react";
import { useTranslation, useLocale } from "@payloadcms/ui";
import { MessageSquareIcon } from "lucide-react";
import { useComments } from "../../providers/CommentsProvider";
import type { FieldLabelClientProps } from "payload";
import type { Label } from "./types";
import { resolveLabel } from "./utils/resolveLabel";
import { excludeComments } from "./utils/exludeComments";
import { useStablePath } from "./hooks/useStablePath";
import { useCommentsDrawer } from "../../providers/CommentsDrawerProvider";
import { IconButton } from "../IconButton";
import { AddCommentPopup } from "./AddCommentPopup";

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
  const { open: openDrawer, setScrollTargetPath } = useCommentsDrawer();
  const { visibleComments, setFilter, mode } = useComments();

  const [isHovered, setIsHovered] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const resolvedLabel = resolveLabel(label, locale);
  const stablePath = useStablePath(fieldPath ?? "");
  const fieldComments = excludeComments(visibleComments, stablePath || undefined, locale);
  const openCommentsCount = fieldComments.length;

  const handleOpenDrawer = () => {
    setFilter("open");
    setScrollTargetPath(stablePath || null);
    openDrawer();
  };

  const handleToggle = (isOpen: boolean) => {
    setIsPopupOpen(isOpen);
  };

  return (
    <div
      className="flex items-center gap-1.5 pb-1.25"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}>
      {resolvedLabel && (
        <label className="field-label p-0" htmlFor={htmlFor}>
          {resolvedLabel}

          {required && <span className="required">*</span>}
        </label>
      )}

      {fieldPath && (mode === "document" || mode === "global-document") && (
        <div className="relative flex items-center">
          {openCommentsCount > 0 ?
            <IconButton
              className="w-auto px-1 gap-1 text-[12px] font-semibold leading-none"
              size="sm"
              title={t("comments:openComments" as never, { count: openCommentsCount })}
              onClick={handleOpenDrawer}>
              <MessageSquareIcon size={14} />

              {openCommentsCount}
            </IconButton>
          : <AddCommentPopup fieldPath={stablePath} showTrigger={isHovered || isPopupOpen} onToggle={handleToggle} />}
        </div>
      )}
    </div>
  );
}

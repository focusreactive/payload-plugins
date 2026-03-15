"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation, useLocale } from "@payloadcms/ui";
import { MessageSquareIcon, MessageSquarePlus } from "lucide-react";
import { cn } from "../../utils/general/cn";
import { useComments } from "../../providers/CommentsProvider";
import type { FieldLabelClientProps } from "payload";
import type { Label } from "./types";
import { resolveLabel } from "./utils/resolveLabel";
import { excludeComments } from "./utils/exludeComments";
import { CommentsButton } from "./components/CommentsButton";
import { useStablePath } from "./hooks/useStablePath";
import { useCommentsDrawer } from "../../providers/CommentsDrawerProvider";
import { CommentEditor } from "../CommentEditor";
import type { CommentEditorHandle } from "../CommentEditor";

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
  const { visibleComments, setFilter, mode, globalSlug } = useComments();

  const [isHovered, setIsHovered] = useState(false);
  const [showPopover, setShowPopover] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);
  const commentEditorRef = useRef<CommentEditorHandle>(null);

  const resolvedLabel = resolveLabel(label, locale);
  const stablePath = useStablePath(fieldPath ?? "");
  const fieldComments = excludeComments(visibleComments, stablePath || undefined, locale);
  const openCommentsCount = fieldComments.length;

  useEffect(() => {
    if (!showPopover) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const popover = popoverRef.current;

      if (popover && !popover.contains(target)) {
        setShowPopover(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPopover]);

  const handleOpenDrawer = () => {
    setFilter("open");
    setScrollTargetPath(stablePath || null);
    openDrawer();
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
            <CommentsButton
              className="gap-1 text-[12px] font-semibold leading-none"
              title={t("comments:openComments" as never, { count: openCommentsCount })}
              onClick={handleOpenDrawer}>
              <MessageSquareIcon width={14} height={14} />

              {openCommentsCount}
            </CommentsButton>
          : <CommentsButton
              className={cn("aspect-square", isHovered || showPopover ? "opacity-100" : "opacity-0")}
              title={t("comments:add" as never)}
              onClick={() => setShowPopover(true)}>
              <MessageSquarePlus width={14} height={14} />
            </CommentsButton>
          }

          {showPopover && (
            <div
              ref={popoverRef}
              className="absolute right-0 top-full transform-x-[translate(100%)] mt-1.5 z-50 w-64 rounded border border-(--theme-elevation-200) bg-(--theme-bg) shadow-lg p-3">
              <p className="m-0 mb-2 text-[12px] font-semibold text-(--theme-elevation-600)">
                {t("comments:add" as never)}
              </p>

              <CommentEditor
                ref={commentEditorRef}
                fieldPath={stablePath || undefined}
                globalSlug={mode === "global-document" ? (globalSlug ?? undefined) : undefined}
                autoFocus
                onSuccessAddComment={() => setShowPopover(false)}
                onEscapePress={() => setShowPopover(false)}
                placeholder={`${t("comments:writeComment" as never)}…`}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

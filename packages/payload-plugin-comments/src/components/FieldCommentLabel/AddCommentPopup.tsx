"use client";

import { Popup, useTranslation } from "@payloadcms/ui";
import { IconButton } from "../IconButton";
import { cn } from "../../utils/general/cn";
import { MessageSquarePlus } from "lucide-react";
import { CommentEditor } from "../CommentEditor";
import { useComments } from "../../providers/CommentsProvider";

interface Props {
  fieldPath: string;
  showTrigger: boolean;
  onToggle: (isOpen: boolean) => void;
}

export function AddCommentPopup({ fieldPath, showTrigger, onToggle }: Props) {
  const { t } = useTranslation();
  const { mode, globalSlug } = useComments();

  const trigger = (
    <IconButton className={cn(showTrigger ? "opacity-100" : "opacity-0")} size="sm" title={t("comments:add" as never)}>
      <MessageSquarePlus size={14} />
    </IconButton>
  );

  return (
    <Popup
      buttonType="custom"
      button={trigger}
      horizontalAlign="right"
      size="fit-content"
      onToggleOpen={onToggle}
      render={({ close }) => (
        <div className="w-80">
          <p className="m-0 mb-3 text-[14px] font-semibold text-(--theme-text)">{t("comments:add" as never)}</p>

          <CommentEditor
            fieldPath={fieldPath}
            globalSlug={mode === "global-document" ? (globalSlug ?? undefined) : undefined}
            autoFocus
            onSuccessAddComment={close}
            onEscapePress={close}
            placeholder={`${t("comments:writeComment" as never)}…`}
          />
        </div>
      )}
    />
  );
}

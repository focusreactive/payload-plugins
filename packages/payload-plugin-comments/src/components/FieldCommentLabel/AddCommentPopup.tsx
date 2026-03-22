"use client";

import { Popup, useTranslation } from "@payloadcms/ui";
import { IconButton } from "../IconButton";
import { cn } from "../../utils/general/cn";
import { MessageSquarePlus } from "lucide-react";
import { CommentEditor, type CommentEditorHandle } from "../CommentEditor";
import { useComments } from "../../providers/CommentsProvider";
import { useRef } from "react";

interface Props {
  fieldPath: string;
  showTrigger: boolean;
  onToggle: (isOpen: boolean) => void;
}

export function AddCommentPopup({ fieldPath, showTrigger, onToggle }: Props) {
  const { t } = useTranslation();
  const { mode, globalSlug } = useComments();
  const editorAPI = useRef<CommentEditorHandle | null>(null);

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
      onToggleOpen={(active: boolean) => {
        onToggle(active);
        setTimeout(() => editorAPI.current?.focus());
      }}
      onToggleClose={() => {
        onToggle(false);
        editorAPI.current?.clear();
      }}
      render={({ close }) => (
        <div className="w-80">
          <p className="m-0 mb-3 text-[14px] font-semibold text-(--theme-text)">{t("comments:add" as never)}</p>

          <CommentEditor
            ref={editorAPI}
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

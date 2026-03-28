import { CircleCheck, Trash2, Undo2 } from "lucide-react";
import { ConfirmationModal, useModal, useTranslation } from "@payloadcms/ui";
import { IconButton } from "../IconButton";

interface Props {
  commentId: string | number;
  isResolved: boolean;
  canDelete: boolean;
  onResolve: () => void;
  onDelete: () => void;
}

export function ToolsPanel({ commentId, isResolved, canDelete, onDelete, onResolve }: Props) {
  const DELETE_MODAL_SLUG = `comments-delete-${commentId}`;
  const { t } = useTranslation();
  const { openModal } = useModal();

  return (
    <>
      <div className="absolute top-3 right-3 flex bg-(--theme-elevation-0) p-1 border rounded-md border-(--theme-elevation-100) opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto">
        <IconButton
          onClick={onResolve}
          title={
            isResolved ? (t("comments:reopen" as never) ?? "Reopen") : (t("comments:resolve" as never) ?? "Resolve")
          }>
          {isResolved ?
            <Undo2 size={16} />
          : <CircleCheck size={16} />}
        </IconButton>

        {canDelete && (
          <IconButton onClick={() => openModal(DELETE_MODAL_SLUG)} title={t("comments:delete" as never) ?? "Delete"}>
            <Trash2 size={16} />
          </IconButton>
        )}
      </div>

      <ConfirmationModal
        modalSlug={DELETE_MODAL_SLUG}
        heading={t("comments:deleteComment:heading" as never)}
        body={t("comments:deleteComment:body" as never)}
        confirmingLabel={t("comments:deleteComment:confirming" as never)}
        confirmLabel={t("comments:deleteComment:confirm" as never)}
        cancelLabel={t("comments:deleteComment:cancel" as never)}
        onConfirm={onDelete}
      />
    </>
  );
}

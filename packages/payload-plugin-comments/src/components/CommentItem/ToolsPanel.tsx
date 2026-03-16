import { CircleCheck, Trash2, Undo2 } from "lucide-react";
import { useTranslation } from "@payloadcms/ui";
import { IconButton } from "../IconButton";

interface Props {
  isResolved: boolean;
  canDelete: boolean;
  onResolve: () => void;
  onDelete: () => void;
}

export function ToolsPanel({ isResolved, canDelete, onDelete, onResolve }: Props) {
  const { t } = useTranslation();

  return (
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
        <IconButton onClick={onDelete} title={t("comments:delete" as never) ?? "Delete"}>
          <Trash2 size={16} />
        </IconButton>
      )}
    </div>
  );
}

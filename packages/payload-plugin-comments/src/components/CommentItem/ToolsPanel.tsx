import { CircleCheck, Trash2, Undo2 } from "lucide-react";
import { cn } from "../../utils/general/cn";
import { useTranslation } from "@payloadcms/ui";

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
      <button
        className={cn(
          "flex justify-center items-center p-0 w-[24px] h-[24px] rounded border-none text-(--theme-elevation-450) bg-transparent hover:bg-(--theme-elevation-50) transition-colors cursor-pointer",
        )}
        type="button"
        onClick={onResolve}
        title={isResolved ? (t("comments:reopen" as never) ?? "Reopen") : (t("comments:resolve" as never) ?? "Resolve")}
        aria-label={
          isResolved ? (t("comments:reopen" as never) ?? "Reopen") : (t("comments:resolve" as never) ?? "Resolve")
        }>
        {isResolved ?
          <Undo2 size={16} />
        : <CircleCheck size={16} />}
      </button>

      {canDelete && (
        <button
          className="flex justify-center items-center p-0 w-[24px] h-[24px] rounded border-none bg-transparent hover:bg-(--theme-elevation-50) transition-colors text-(--theme-elevation-450) cursor-pointer"
          type="button"
          onClick={onDelete}
          title={t("comments:delete" as never) ?? "Delete"}
          aria-label={t("comments:delete" as never) ?? "Delete"}>
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}

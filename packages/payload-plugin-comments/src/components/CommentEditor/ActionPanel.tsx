import { AtSign, SendHorizontal } from "lucide-react";
import { IconButton } from "../IconButton";
import { useTranslation } from "@payloadcms/ui";
import { cn } from "../../utils/general/cn";

interface Props {
  className?: string;
  onMention: () => void;
  onAddComment: () => void;
}

export function ActionPanel({ className, onMention, onAddComment }: Props) {
  const { t } = useTranslation();

  return (
    <div className={cn("flex justify-end items-center gap-1 pt-2", className)}>
      <IconButton title="Mention user" onClick={onMention}>
        <AtSign size={16} />
      </IconButton>

      <hr className="w-px h-[20px] bg-(--theme-elevation-150) m-0" />

      <IconButton variant="primary" title={t("comments:comment" as never)} onClick={onAddComment}>
        <SendHorizontal size={16} />
      </IconButton>
    </div>
  );
}

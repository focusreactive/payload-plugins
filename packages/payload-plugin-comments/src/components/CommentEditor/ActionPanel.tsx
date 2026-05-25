import { useTranslation } from "@payloadcms/ui";
import { AtSign, SendHorizontal } from "lucide-react";
import { useRef, useEffect } from "react";

import { cn } from "../../utils/general/cn";
import { IconButton } from "../IconButton";

interface Props {
  className?: string;
  onMention: () => void;
  onAddComment: () => void;
}

export function ActionPanel({ className, onMention, onAddComment }: Props) {
  const { t } = useTranslation();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {return;}

    const handleClick = (e: MouseEvent) => {
      e.stopPropagation();

      const target = e.target as HTMLElement;

      const action = target
        .closest("[data-action]").dataset.action;

      if (action === "mention") {onMention();}
      if (action === "add-comment") {onAddComment();}
    };

    wrapper.addEventListener("click", handleClick);

    return () => wrapper.removeEventListener("click", handleClick);
  }, [onMention, onAddComment]);

  return (
    <div
      ref={wrapperRef}
      className={cn("flex justify-end items-center gap-1 pt-2", className)}
    >
      <IconButton title="Mention user" data-action="mention">
        <AtSign size={16} />
      </IconButton>

      <hr className="w-px h-[20px] bg-(--theme-elevation-150) m-0" />

      <IconButton
        variant="primary"
        title={t("comments:comment" as never)}
        data-action="add-comment"
      >
        <SendHorizontal size={16} />
      </IconButton>
    </div>
  );
}

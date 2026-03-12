"use client";

import { Button, useTranslation } from "@payloadcms/ui";
import { MessageSquare } from "lucide-react";
import { useComments } from "../../providers/CommentsProvider";
import { CommentsDrawer } from "../CommentsDrawer";
import { useCommentsDrawer } from "../../providers/CommentsDrawerProvider";

export function CommentsHeaderButton() {
  const { allComments, mode, visibleComments } = useComments();
  const { slug, open } = useCommentsDrawer();
  const { t } = useTranslation();

  const openCount = (mode === "document" ? visibleComments : allComments).filter((c) => !c.isResolved).length;

  const handleOpen = () => {
    open();
  };

  return (
    <>
      <Button
        buttonStyle="none"
        onClick={handleOpen}
        aria-label={t("comments:openCommentsAria" as never)}
        className="relative">
        <MessageSquare size={20} />

        {openCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {openCount > 99 ? "99+" : openCount}
          </span>
        )}
      </Button>

      <CommentsDrawer slug={slug} />
    </>
  );
}

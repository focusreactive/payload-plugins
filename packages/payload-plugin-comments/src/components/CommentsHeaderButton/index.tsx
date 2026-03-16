"use client";

import { useTranslation } from "@payloadcms/ui";
import { MessageSquare } from "lucide-react";
import { CommentsDrawer } from "../CommentsDrawer";
import { useCommentsDrawer } from "../../providers/CommentsDrawerProvider";
import { IconButton } from "../IconButton";

export function CommentsHeaderButton() {
  const { slug, open } = useCommentsDrawer();
  const { t } = useTranslation();

  return (
    <>
      <IconButton variant="neutralSecondary" onClick={() => open()} title={t("comments:openCommentsAria" as never)}>
        <MessageSquare size={16} />
      </IconButton>

      <CommentsDrawer slug={slug} />
    </>
  );
}

"use client";

import { useTranslation } from "@payloadcms/ui";
import { CommentsDrawer } from "../CommentsDrawer";
import { useCommentsDrawer } from "../../providers/CommentsDrawerProvider";
import { IconButton } from "../IconButton";
import { Bell } from "lucide-react";

export function CommentsHeaderButton() {
  const { slug, open } = useCommentsDrawer();
  const { t } = useTranslation();

  return (
    <>
      <IconButton variant="neutralSecondary" onClick={() => open()} title={t("comments:openCommentsAria" as never)}>
        <Bell size={16} />
      </IconButton>

      <CommentsDrawer slug={slug} />
    </>
  );
}

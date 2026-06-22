"use client";

import { useLocale, useTranslation } from "@payloadcms/ui";
import { Bell } from "lucide-react";
import { CommentsDrawer } from "../CommentsDrawer";
import { useCommentsDrawer } from "../../providers/CommentsDrawerProvider";
import { IconButton } from "../IconButton";
import { UnreadBadge } from "./UnreadBadge";
import { useUnreadMentionsCountQuery } from "../../api/queries/useUnreadMentionsCountQuery";
import { useComments } from "../../providers/CommentsProvider";

export function CommentsHeaderButton() {
  const { slug, open } = useCommentsDrawer();
  const { t } = useTranslation();
  const { mode, collectionSlug, documentId, globalSlug } = useComments();
  const { code: locale } = useLocale();
  const { data } = useUnreadMentionsCountQuery({ mode, collectionSlug, documentId, globalSlug, locale });

  const count = data?.count ?? 0;

  return (
    <>
      <IconButton variant="neutralSecondary" onClick={() => open()} title={t("comments:openCommentsAria" as never)} className="relative">
        <Bell size={16} />

        {count > 0 && <UnreadBadge count={count} />}
      </IconButton>

      <CommentsDrawer slug={slug} />
    </>
  );
}

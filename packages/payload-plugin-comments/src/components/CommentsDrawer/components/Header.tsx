"use client";

import { useAuth, useLocale, useModal, useTranslation } from "@payloadcms/ui";
import { XIcon } from "lucide-react";
import { IconButton } from "../../IconButton";
import { CommentsFilter } from "./CommentsFilter";
import { useComments } from "../../../providers/CommentsProvider";
import { useCommentsQuery } from "../../../api/queries/useCommentsQuery";
import { filterCommentsByLocale } from "../../../utils/comment/filterCommentsByLocale";

interface HeaderProps {
  slug: string;
}

export function Header({ slug }: HeaderProps) {
  const { t } = useTranslation();
  const { closeModal } = useModal();
  const { user } = useAuth();
  const { code: locale } = useLocale();
  const { queryContext } = useComments();
  const { data: allComments = [] } = useCommentsQuery(queryContext);
  const openCount = filterCommentsByLocale(allComments, locale).filter((c) => !c.isResolved).length;

  return (
    <header className="sticky top-0 z-10 flex flex-col gap-3 pt-5 pb-4 bg-(--theme-bg) border-b border-(--theme-elevation-100)">
      <div className="flex items-center gap-3">
        <div className="flex items-baseline gap-2.5 min-w-0">
          <h2 className="m-0 text-2xl font-bold">{t("comments:label" as never)}</h2>
          {user && (
            <span className="text-[13px] text-(--theme-elevation-500) tabular-nums">
              {t("comments:openComments" as never, { count: openCount })}
            </span>
          )}
        </div>

        <IconButton
          className="ml-auto"
          onClick={() => closeModal(slug)}
          title={t("comments:close" as never)}
        >
          <XIcon width={16} height={16} />
        </IconButton>
      </div>

      <CommentsFilter />
    </header>
  );
}

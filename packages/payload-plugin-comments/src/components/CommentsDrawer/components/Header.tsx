"use client";

import { useModal, useTranslation } from "@payloadcms/ui";
import { useComments } from "../../../providers/CommentsProvider";
import { LoaderCircleIcon, XIcon } from "lucide-react";
import { IconButton } from "../../IconButton";

interface HeaderProps {
  slug: string;
}

export function Header({ slug }: HeaderProps) {
  const { t } = useTranslation();
  const { closeModal } = useModal();
  const { syncCommentsStatus } = useComments();

  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 py-5 bg-(--theme-bg)">
      <h2 className="m-0 text-2xl font-bold">{t("comments:label" as never)}</h2>

      {syncCommentsStatus === "loading" && (
        <LoaderCircleIcon
          width={14}
          height={14}
          className="text-(--theme-elevation-450) animate-spin shrink-0"
          aria-label={t("comments:syncingComments" as never)}
        />
      )}

      <div className="flex items-center gap-2 ml-auto">
        <IconButton onClick={() => closeModal(slug)} title={t("comments:close" as never)}>
          <XIcon width={16} height={16} />
        </IconButton>
      </div>
    </header>
  );
}

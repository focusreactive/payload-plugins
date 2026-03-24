"use client";

import { useModal, useTranslation } from "@payloadcms/ui";
import { XIcon } from "lucide-react";
import { IconButton } from "../../IconButton";

interface HeaderProps {
  slug: string;
}

export function Header({ slug }: HeaderProps) {
  const { t } = useTranslation();
  const { closeModal } = useModal();

  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 py-5 bg-(--theme-bg)">
      <h2 className="m-0 text-2xl font-bold">{t("comments:label" as never)}</h2>

      <div className="flex items-center gap-2 ml-auto">
        <IconButton onClick={() => closeModal(slug)} title={t("comments:close" as never)}>
          <XIcon width={16} height={16} />
        </IconButton>
      </div>
    </header>
  );
}

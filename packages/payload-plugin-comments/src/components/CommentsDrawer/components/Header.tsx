"use client";

import { useModal, useTranslation } from "@payloadcms/ui";
import { useComments } from "../../../providers/CommentsProvider";
import type { FilterMode } from "../../../types";
import { LoaderCircleIcon, XIcon } from "lucide-react";

interface HeaderProps {
  slug: string;
}

export function Header({ slug }: HeaderProps) {
  const { t } = useTranslation();
  const { closeModal } = useModal();
  const { filter, setFilter, syncCommentsStatus } = useComments();

  const options = [
    { label: t("comments:filterOpen" as never), value: "open" },
    { label: t("comments:filterResolved" as never), value: "resolved" },
    { label: t("comments:filterMentioned" as never), value: "mentioned" },
  ];

  return (
    <header className="sticky top-0 flex items-center gap-3 py-5 bg-(--theme-bg)">
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
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterMode)}
          className="py-1 px-2 rounded border border-(--theme-elevation-200) bg-(--theme-bg) text-(--theme-text) text-sm cursor-pointer">
          {options.map(({ label, value }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => closeModal(slug)}
          aria-label={t("comments:close" as never)}
          className="flex items-center justify-center rounded border-none aspect-square p-1 bg-transparent cursor-pointer text-(--theme-elevation-450) hover:text-(--theme-text) hover:bg-(--theme-elevation-100) transition-colors">
          <XIcon width={18} height={18} />
        </button>
      </div>
    </header>
  );
}

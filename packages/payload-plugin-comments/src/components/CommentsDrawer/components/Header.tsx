"use client";

import { SelectInput, useModal, useTranslation } from "@payloadcms/ui";
import { useComments } from "../../../providers/CommentsProvider";
import type { FilterMode } from "../../../types";
import { LoaderCircleIcon, XIcon } from "lucide-react";
import type { OptionObject } from "payload";
import { IconButton } from "../../IconButton";

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
        <SelectInput
          name="filter"
          path="filter"
          options={options}
          value={filter}
          onChange={(option) => setFilter((option as OptionObject).value as FilterMode)}
          isClearable={false}
        />

        <IconButton onClick={() => closeModal(slug)} title={t("comments:close" as never)}>
          <XIcon width={16} height={16} />
        </IconButton>
      </div>
    </header>
  );
}

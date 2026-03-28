"use client";

import { useModal, useTranslation } from "@payloadcms/ui";
import { FilterIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IconButton } from "../../IconButton";
import { useCommentsFilter } from "../../../providers/CommentsFilterProvider";

interface HeaderProps {
  slug: string;
}

export function Header({ slug }: HeaderProps) {
  const { t } = useTranslation();
  const { closeModal } = useModal();
  const { filters, setFilter, isAnyFilterActive } = useCommentsFilter();
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPopupOpen) return;

    function handleOutsideClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setIsPopupOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isPopupOpen]);

  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 py-5 bg-(--theme-bg)">
      <h2 className="m-0 text-2xl font-bold">{t("comments:label" as never)}</h2>

      <div className="flex items-center gap-2 ml-auto">
        <div className="relative" ref={popupRef}>
          <IconButton
            onClick={() => setIsPopupOpen((v) => !v)}
            title={t("comments:filterComments" as never)}
            variant={"neutral"}
            isActive={isAnyFilterActive}>
            <FilterIcon width={16} height={16} />
          </IconButton>

          {isPopupOpen && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-(--theme-bg) border border-(--theme-border-color) rounded shadow-lg p-3 min-w-[220px] flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={filters.showResolved}
                  onChange={(e) => setFilter("showResolved", e.target.checked)}
                />
                {t("comments:showResolved" as never)}
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={filters.onlyMyThreads}
                  onChange={(e) => setFilter("onlyMyThreads", e.target.checked)}
                />
                {t("comments:onlyMyThreads" as never)}
              </label>
            </div>
          )}
        </div>

        <IconButton onClick={() => closeModal(slug)} title={t("comments:close" as never)}>
          <XIcon width={16} height={16} />
        </IconButton>
      </div>
    </header>
  );
}

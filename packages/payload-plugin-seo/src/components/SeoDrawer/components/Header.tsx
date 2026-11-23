"use client";

import { useModal } from "@payloadcms/ui";
import { XIcon } from "lucide-react";
import type { TotalStatus } from "../../../engine/types/analysis";
import { cn } from "../../../utils/style";
import { statusVar } from "../variants";
import { IconButton } from "../../../ui/IconButton";
import { Pill } from "../../../ui/Pill";
import { useSeoTranslation } from "../../../translations/useSeoTranslation";

interface HeaderProps {
  drawerSlug: string;
  total: number;
  totalStatus: TotalStatus;
}

export function Header({ drawerSlug, total, totalStatus }: HeaderProps) {
  const { closeModal } = useModal();
  const { t } = useSeoTranslation();

  return (
    <div className="relative flex items-center justify-between px-[4px] py-[16px]">
      <div className="flex items-center gap-[11px]">
        <h2 className="text-[16px] font-semibold m-0">{t("title")}</h2>

        {totalStatus === "idle" ? null : <Pill variant={totalStatus}>{total}</Pill>}
      </div>

      <IconButton
        variant="ghost"
        aria-label={t("close")}
        title={t("close")}
        onClick={() => closeModal(drawerSlug)}
      >
        <XIcon aria-hidden="true" width={16} height={16} style={{ width: 16, height: 16 }} />
      </IconButton>

      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-neutral-150">
        <i
          className={cn(
            "block h-full",
            totalStatus === "idle" ? undefined : statusVar({ status: totalStatus })
          )}
          style={{ width: `${total}%`, background: "var(--seo-c)" }}
        />
      </div>
    </div>
  );
}

"use client";

import { useModal, XIcon } from "@payloadcms/ui";
import type { TotalStatus } from "../../../engine/types/analysis";
import { cn } from "../../../utils/style";
import { statusVar, totalPillVariants } from "../variants";

interface HeaderProps {
  drawerSlug: string;
  total: number;
  totalStatus: TotalStatus;
}

export function Header({ drawerSlug, total, totalStatus }: HeaderProps) {
  const { closeModal } = useModal();

  return (
    <div className="relative flex items-center justify-between px-[4px] py-[16px]">
      <div className="flex items-center gap-[11px]">
        <h2 className="text-[16px] font-semibold m-0">SEO Analytics</h2>

        {totalStatus === "idle" ? null : <span className={totalPillVariants({ status: totalStatus })}>{total}</span>}
      </div>

      <button aria-label="Close" className="drawer__header__close" onClick={() => closeModal(drawerSlug)} type="button">
        <XIcon />
      </button>

      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-neutral-150">
        <i className={cn("block h-full", totalStatus === "idle" ? undefined : statusVar({ status: totalStatus }))} style={{ width: `${total}%`, background: "var(--seo-c)" }} />
      </div>
    </div>
  );
}

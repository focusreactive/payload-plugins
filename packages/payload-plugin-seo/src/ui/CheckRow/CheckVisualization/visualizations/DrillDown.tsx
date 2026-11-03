"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "../../../../utils/style";
import type { DrilldownModel } from "../../../../engine/types/visualization";
import { useSeoTranslation } from "../../../../translations/useSeoTranslation";

export function DrillDown({ items, noun }: DrilldownModel) {
  const { t } = useSeoTranslation();
  const [open, setOpen] = useState(false);

  if (!items.length) return null;

  return (
    <>
      <button
        type="button"
        className="mt-[8px] text-[11px] text-neutral-700 bg-neutral-100 border border-neutral-200 rounded-rs px-[9px] py-[4px] cursor-pointer inline-flex items-center gap-[4px]"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <>
            {t("viz.hide")} <ChevronUp size={14} />
          </>
        ) : (
          <>
            {t(`viz.show.${noun}`, { count: items.length })} <ChevronDown size={14} />
          </>
        )}
      </button>

      <div className={cn("mt-[8px] flex-col gap-[4px]", open ? "flex" : "hidden")}>
        {items.map((it, i) => (
          <div
            className="flex justify-between text-[11px] text-neutral-700 bg-neutral-50 rounded-rs px-[9px] py-[4px]"
            key={`${it.left}-${i}`}
          >
            <span>{it.left}</span>
            <span className="text-neutral-1000">{it.right}</span>
          </div>
        ))}
      </div>
    </>
  );
}

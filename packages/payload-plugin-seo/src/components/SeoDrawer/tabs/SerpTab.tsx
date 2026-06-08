"use client";
import { cva } from "class-variance-authority";
import { useState } from "react";
import type { SerpResult, Status } from "../../../engine/types";
import { MeterBar } from "../parts/MeterBar";
import { TITLE_WIDTH_BUDGET_PX, META_DESCRIPTION_MAX_CHARS } from "../../../constants";

type Mode = "mobile" | "desktop";

const serpModeVariants = cva("inline-flex items-center gap-[5px] px-[11px] py-[4px] rounded-rs text-[11px] font-medium border-0 bg-transparent cursor-pointer text-neutral-600", {
  variants: {
    active: {
      true: "bg-neutral-0 text-neutral-1000 shadow-[0_1px_2px_rgba(0,0,0,0.08)]",
      false: "",
    },
  },
  defaultVariants: { active: false },
});

export function SerpTab({ data }: { data: SerpResult; keyphrase: string; faviconUrl: string }) {
  const [mode, setMode] = useState<Mode>("mobile");
  const titlePct = (data.titleWidthPx / TITLE_WIDTH_BUDGET_PX) * 100;
  const descPct = (data.descriptionChars / META_DESCRIPTION_MAX_CHARS) * 100;
  const titleStatus: Status = data.titleWidthPx <= 580 ? "good" : data.titleWidthPx <= 600 ? "warn" : "bad";
  const descStatus: Status = data.descriptionChars >= 120 && data.descriptionChars <= META_DESCRIPTION_MAX_CHARS ? "good" : "warn";

  return (
    <section className="flex flex-col gap-[13px]">
      <div className="bg-neutral-0 border border-neutral-200 rounded-rm overflow-hidden">
        <div className="flex items-center justify-between px-[15px] py-[11px] border-b border-neutral-200">
          <span className="font-semibold text-[12.5px]">Search result preview</span>
          <div className="inline-flex bg-neutral-100 border border-neutral-200 rounded-rm p-[2px] gap-[2px]">
            <button type="button" className={serpModeVariants({ active: mode === "mobile" })} onClick={() => setMode("mobile")}>
              Mobile
            </button>
            <button type="button" className={serpModeVariants({ active: mode === "desktop" })} onClick={() => setMode("desktop")}>
              Desktop
            </button>
          </div>
        </div>
        <div className="p-[15px]"></div>
        <div className="border-t border-neutral-200 px-[15px] py-[12px] flex flex-col gap-[10px]">
          <MeterBar name="Title width" valueLabel={`${data.titleWidthPx} / ${TITLE_WIDTH_BUDGET_PX} px`} pct={titlePct} status={titleStatus} />
          <MeterBar name="Meta description" valueLabel={`${data.descriptionChars} / ${META_DESCRIPTION_MAX_CHARS} chars`} pct={descPct} status={descStatus} />
        </div>
      </div>
    </section>
  );
}

"use client";

import { cva } from "class-variance-authority";
import { cn } from "../../../utils/style";
import type { Status } from "../../../engine/types";
import { statusVar } from "../variants";

const swatchVariants = cva("w-[8px] h-[8px] rounded-[2px] inline-block", {
  variants: {
    tone: {
      good: "bg-seo-good",
      warn: "bg-seo-warn",
      bad: "bg-seo-bad",
      muted: "bg-neutral-300",
    },
  },
});

export type SwatchTone = "good" | "warn" | "bad" | "muted";

interface SegmentBarProps {
  countLabel?: string;
  filledPct: number;
  filledStatus: Status;
  legend?: { tone: SwatchTone; label: string }[];
}

export function SegmentBar({ countLabel, filledPct, filledStatus, legend }: SegmentBarProps) {
  return (
    <>
      {countLabel && (
        <div className="text-[10px] text-neutral-500 font-mono mb-[4px] flex justify-end">
          <span>{countLabel}</span>
        </div>
      )}

      <div className="flex h-[6px] rounded-[3px] overflow-hidden">
        <i className={cn("block h-full", statusVar({ status: filledStatus }))} style={{ width: `${filledPct}%`, background: "var(--seo-c)" }} />
        <i className="block h-full bg-neutral-150" style={{ width: `${100 - filledPct}%` }} />
      </div>

      {legend && (
        <div className="flex gap-[14px] text-[11px] mt-[6px]">
          {legend.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-[5px] text-neutral-700">
              <span className={swatchVariants({ tone: l.tone })} />
              {l.label}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

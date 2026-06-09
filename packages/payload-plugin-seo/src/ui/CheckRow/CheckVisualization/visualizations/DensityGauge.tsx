"use client";

import { cn } from "../../../../utils/style";
import { statusVar } from "../../../../components/SeoDrawer/variants";
import type { GaugeModel } from "../../../../engine/types/visualization";

export function DensityGauge({ bands, markerPct, markerLabel, markerStatus, labels }: GaugeModel) {
  return (
    <>
      <div className="relative h-[6px] rounded-[3px] mt-[24px] mb-[14px]">
        {bands.map((band, i) => (
          <i
            key={`${band.status}-${i}`}
            className={cn("absolute inset-y-0", statusVar({ status: band.status }), i === 0 && "rounded-l-[3px]", i === bands.length - 1 && "rounded-r-[3px]")}
            style={{
              left: `${band.startPct}%`,
              width: `${band.endPct - band.startPct}%`,
              background: "var(--seo-c)",
            }}
          />
        ))}
        <div className={cn("absolute -top-[3px] -translate-x-1/2 flex flex-col items-center", statusVar({ status: markerStatus }))} style={{ left: `${markerPct}%` }}>
          <span className="absolute bottom-[16px] font-mono font-bold text-[11px] whitespace-nowrap" style={{ color: "var(--seo-c)" }}>
            {markerLabel}
          </span>
          <span className="w-[12px] h-[12px] rounded-full bg-neutral-0 border-2" style={{ borderColor: "var(--seo-c)" }} />
        </div>
      </div>
      <div className="relative h-[14px] text-[10px] text-neutral-500">
        {labels.map((label, i) => (
          <span
            key={`${label.text}-${i}`}
            className={cn("absolute whitespace-nowrap", label.pct <= 0 ? "translate-x-0" : label.pct >= 100 ? "-translate-x-full" : "-translate-x-1/2", label.emphasis === "good" && "text-seo-good")}
            style={{ left: `${label.pct}%` }}
          >
            {label.text}
          </span>
        ))}
      </div>
    </>
  );
}

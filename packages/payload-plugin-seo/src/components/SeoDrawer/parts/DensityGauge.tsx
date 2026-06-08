"use client";

import { cn } from "../../../utils/style";
import type { Status } from "../../../engine/types";
import { statusVar } from "../variants";

export interface Band {
  width: number;
  status: Status;
}

interface DensityGaugeProps {
  bands: Band[];
  markerPct: number;
  markerLabel: string;
  markerStatus: Status;
  scale: [string, string, string];
}

export function DensityGauge({ bands, markerPct, markerLabel, markerStatus, scale }: DensityGaugeProps) {
  return (
    <>
      <div className="relative h-[6px] rounded-[3px] flex mt-[24px] mb-[14px]">
        {bands.map((b, i) => (
          <i key={`${b.status}-${i}`} className={cn("first:rounded-l-[3px] last:rounded-r-[3px]", statusVar({ status: b.status }))} style={{ width: `${b.width}%`, background: "var(--seo-c)" }} />
        ))}
        <div className={cn("absolute -top-[3px] -translate-x-1/2 flex flex-col items-center", statusVar({ status: markerStatus }))} style={{ left: `${markerPct}%` }}>
          <span className="absolute bottom-[16px] font-mono font-bold text-[11px] whitespace-nowrap" style={{ color: "var(--seo-c)" }}>
            {markerLabel}
          </span>
          <span className="w-[12px] h-[12px] rounded-full bg-neutral-0 border-2" style={{ borderColor: "var(--seo-c)" }} />
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-neutral-500">
        <span>{scale[0]}</span>
        <span className="text-seo-good">{scale[1]}</span>
        <span>{scale[2]}</span>
      </div>
    </>
  );
}

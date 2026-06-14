"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "../../../../utils/style";
import { statusVar } from "../../../../components/SeoDrawer/variants";
import type { GaugeModel } from "../../../../engine/types/visualization";

export function DensityGauge({ bands, markerPct, markerLabel, markerStatus, labels }: GaugeModel) {
  const barRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const [dims, setDims] = useState({ bar: 0, label: 0 });

  const markerPx = (markerPct / 100) * dims.bar;
  const halfLabel = dims.label / 2;
  const labelAlign = dims.label === 0 ? "-translate-x-1/2" : markerPx < halfLabel ? "translate-x-0" : markerPx > dims.bar - halfLabel ? "-translate-x-full" : "-translate-x-1/2";

  useLayoutEffect(() => {
    const bar = barRef.current;
    const label = labelRef.current;

    if (!(bar && label)) return;

    const measure = () => setDims({ bar: bar.offsetWidth, label: label.offsetWidth });

    const observer = new ResizeObserver(measure);

    measure();
    observer.observe(bar);
    observer.observe(label);

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={barRef} className="relative h-[6px] rounded-[3px] mt-[24px] mb-[14px]">
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
        <span
          ref={labelRef}
          className={cn("absolute bottom-[13px] font-mono font-bold text-[11px] whitespace-nowrap", statusVar({ status: markerStatus }), labelAlign)}
          style={{ left: `${markerPct}%`, color: "var(--seo-c)" }}
        >
          {markerLabel}
        </span>
        <span
          className={cn("absolute -top-[3px] -translate-x-1/2 block w-[12px] h-[12px] rounded-full bg-neutral-0 border-2", statusVar({ status: markerStatus }))}
          style={{ left: `${markerPct}%`, borderColor: "var(--seo-c)" }}
        />
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

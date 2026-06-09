"use client";

import type { Status } from "../engine/types/analysis";
import { statusVar } from "../components/SeoDrawer/variants";

interface MeterBarProps {
  name: string;
  valueLabel: string;
  pct: number;
  status: Status;
}

export function MeterBar({ name, valueLabel, pct, status }: MeterBarProps) {
  return (
    <div className={statusVar({ status })}>
      <div className="flex justify-between text-[10.5px] mb-[4px]">
        <span className="text-neutral-600 font-semibold uppercase tracking-[0.04em]">{name}</span>
        <span className="font-mono font-semibold" style={{ color: "var(--seo-c)" }}>
          {valueLabel}
        </span>
      </div>

      <div className="h-[6px] rounded-[3px] bg-neutral-150 overflow-hidden">
        <i
          className="block h-full"
          style={{
            width: `${Math.min(100, pct)}%`,
            background: "var(--seo-c)",
          }}
        />
      </div>
    </div>
  );
}

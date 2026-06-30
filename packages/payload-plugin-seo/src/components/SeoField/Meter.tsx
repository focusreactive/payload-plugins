"use client";

import type { Measurement } from "../../measure/measure";
import { Pill } from "../../ui/Pill";
import { cn } from "../../utils/style";

const STATUS_TO_VARIANT = {
  good: "good",
  short: "warn",
  long: "bad",
} as const;
const STATUS_LABEL = {
  good: "Good",
  short: "Too short",
  long: "Too long",
} as const;
const FILL_CLASS = {
  good: "bg-seo-good",
  short: "bg-seo-warn",
  long: "bg-seo-bad",
} as const;

interface MeterProps {
  measurement: Measurement;
  hasText: boolean;
  loading: boolean;
  kindLabel: string;
}

export function Meter({ measurement, hasText, loading, kindLabel }: MeterProps) {
  const { value, min, max, status, unit } = measurement;

  const readout = unit === "px" ? `${value} / ${max} px` : `${value} / ${max}`;

  const pct = (n: number) => `${Math.min(100, Math.max(0, (n / max) * 100))}%`;

  return (
    <div className="mt-[11px] flex items-center gap-[12px]">
      <div className="relative h-[6px] flex-1 overflow-hidden rounded-full bg-neutral-100">
        <span
          className="absolute inset-y-0 border-x border-seo-good/40 bg-seo-good/15"
          style={{
            left: pct(min),
            right: `calc(100% - ${pct(max)})`,
          }}
        />

        {hasText && !loading && (
          <span
            className={cn("absolute inset-y-0 left-0 rounded-full", FILL_CLASS[status])}
            style={{ width: pct(value) }}
          />
        )}

        {loading && <span className="absolute inset-0 animate-pulse bg-neutral-200" />}
      </div>

      <span
        className="whitespace-nowrap text-[12px] tabular-nums text-neutral-500"
        style={{ fontFamily: "ui-monospace, monospace" }}
      >
        {loading ? `— / ${max}` : readout}
      </span>

      {hasText && !loading ? (
        <Pill variant={STATUS_TO_VARIANT[status]}>{STATUS_LABEL[status]}</Pill>
      ) : (
        <Pill variant="neutral">{loading ? "Working…" : `No ${kindLabel}`}</Pill>
      )}
    </div>
  );
}

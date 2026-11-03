"use client";

import { cva } from "class-variance-authority";
import type { Measurement } from "../../measure/measure";
import type { SeoFieldKind } from "../../server/generate/prompts";
import type { TranslationKey } from "../../translations/types";
import { Pill } from "../../ui/Pill";
import { useSeoTranslation } from "../../translations/useSeoTranslation";

const STATUS_TO_VARIANT = {
  good: "good",
  short: "warn",
  long: "bad",
} as const;
const STATUS_LABEL_KEY = {
  good: "meter.good",
  short: "meter.short",
  long: "meter.long",
} as const satisfies Record<Measurement["status"], TranslationKey>;
const fillVariants = cva("absolute inset-y-0 left-0 rounded-full", {
  variants: {
    status: {
      good: "bg-seo-good",
      short: "bg-seo-warn",
      long: "bg-seo-bad",
    },
  },
});

interface MeterProps {
  measurement: Measurement;
  hasText: boolean;
  loading: boolean;
  kind: SeoFieldKind;
}

export function Meter({ measurement, hasText, loading, kind }: MeterProps) {
  const { t } = useSeoTranslation();
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
          <span className={fillVariants({ status })} style={{ width: pct(value) }} />
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
        <Pill variant={STATUS_TO_VARIANT[status]}>{t(STATUS_LABEL_KEY[status])}</Pill>
      ) : (
        <Pill variant="neutral">{t(loading ? "meter.working" : `meter.empty.${kind}`)}</Pill>
      )}
    </div>
  );
}

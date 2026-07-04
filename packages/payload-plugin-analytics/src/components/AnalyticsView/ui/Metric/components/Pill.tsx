import { cn } from "../../../../../utils/style";
import type { MetricTone } from "../types";
import { ArrowForTone } from "./ArrowForTone";

interface PillProps {
  tone: MetricTone;
  formattedPrev: string;
}

export function Pill({ tone, formattedPrev }: PillProps) {
  return (
    <span
      data-tone={tone}
      className={cn(
        "inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-medium leading-none tabular-nums",
        tone === "positive" &&
          "bg-(--franalytics-metric-pos-bg) text-(--franalytics-metric-pos-fg)",
        tone === "negative" &&
          "bg-(--franalytics-metric-neg-bg) text-(--franalytics-metric-neg-fg)",
        tone === "flat" && "bg-(--franalytics-metric-flat-bg) text-(--franalytics-metric-flat-fg)"
      )}
      style={{ borderRadius: "var(--franalytics-metric-prev-radius)" }}
    >
      <ArrowForTone tone={tone} />
      {formattedPrev}
    </span>
  );
}

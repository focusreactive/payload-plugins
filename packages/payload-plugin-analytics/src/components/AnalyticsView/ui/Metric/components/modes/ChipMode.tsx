import type { MetricModeProps } from ".";
import { cn } from "../../../../../../utils/style";
import { ArrowForTone } from "../ArrowForTone";

export function ChipMode({ formattedValue, formattedPrev, tone, icon: Icon }: MetricModeProps) {
  const hasPrev = tone != null && formattedPrev != null;

  return (
    <span data-metric-mode="chip" className="inline-flex items-stretch align-middle gap-px text-[11.5px] tabular-nums">
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-(--theme-elevation-100) text-(--theme-elevation-700)"
        style={{
          borderTopLeftRadius: "var(--metric-prev-radius)",
          borderBottomLeftRadius: "var(--metric-prev-radius)",
          borderTopRightRadius: hasPrev ? "4px" : "var(--metric-prev-radius)",
          borderBottomRightRadius: hasPrev ? "4px" : "var(--metric-prev-radius)",
        }}
      >
        {Icon && <Icon size={11} aria-hidden />}
        {formattedValue}
      </span>

      {hasPrev && (
        <span
          data-tone={tone}
          className={cn(
            "inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-medium tabular-nums",
            tone === "positive" && "bg-(--metric-pos-bg) text-(--metric-pos-fg)",
            tone === "negative" && "bg-(--metric-neg-bg) text-(--metric-neg-fg)",
            tone === "flat" && "bg-(--metric-flat-bg) text-(--metric-flat-fg)"
          )}
          style={{
            borderTopLeftRadius: "4px",
            borderBottomLeftRadius: "4px",
            borderTopRightRadius: "var(--metric-prev-radius)",
            borderBottomRightRadius: "var(--metric-prev-radius)",
          }}
        >
          <ArrowForTone tone={tone} />
          {formattedPrev}
        </span>
      )}
    </span>
  );
}

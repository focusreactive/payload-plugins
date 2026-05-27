import type { MetricModeProps } from ".";

import { Pill } from "../Pill";

export function InlineMode({ formattedValue, formattedPrev, tone, icon: Icon }: MetricModeProps) {
  return (
    <span data-metric-mode="inline" className="inline-flex items-center gap-1.5 tabular-nums">
      {Icon && <Icon size={12} aria-hidden className="text-(--theme-elevation-500)" />}

      <span className="text-[12.5px] font-medium">{formattedValue}</span>

      {tone && formattedPrev != null && <Pill tone={tone} formattedPrev={formattedPrev} />}
    </span>
  );
}

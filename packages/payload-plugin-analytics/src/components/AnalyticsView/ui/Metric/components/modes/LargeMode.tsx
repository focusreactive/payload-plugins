import type { MetricModeProps } from ".";
import { Pill } from "../Pill";

export function LargeMode({ formattedValue, formattedPrev, tone, icon: Icon }: MetricModeProps) {
  return (
    <div data-metric-mode="large" className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={14} aria-hidden className="text-(--theme-elevation-500)" />}
        <span className="text-[28px] font-semibold leading-[1.1] tracking-tight text-(--theme-elevation-1000) tabular-nums">{formattedValue}</span>
      </div>

      {tone && formattedPrev != null && (
        <div>
          <Pill tone={tone} formattedPrev={formattedPrev} />
        </div>
      )}
    </div>
  );
}

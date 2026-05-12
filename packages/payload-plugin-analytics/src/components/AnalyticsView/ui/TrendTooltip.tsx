import type { TrendMetric } from "./TrendChart";
import { formatShortDate, formatNumber } from "../numberFormatters";

interface RechartsTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      date: string;
      current: number;
      previous?: number | null;
      previousDate?: string;
    };
  }>;
}

export function TrendTooltip({ active, payload, metric }: RechartsTooltipProps & { metric: TrendMetric }) {
  if (!active || !payload?.length) return null;

  const { current, date, previous } = payload[0]!.payload;

  return (
    <div className="bg-[var(--theme-elevation-0)] border border-[var(--theme-border-color)] rounded-[var(--style-radius-s)] px-2.5 py-2 text-xs shadow-popover">
      <div className="text-[11px] text-[var(--theme-elevation-500)] font-[family-name:var(--font-mono)] mb-1">
        {formatShortDate(date)} 2026
      </div>

      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[var(--theme-elevation-1000)]" />
        <span className="capitalize">{metric}</span>
        <span className="ml-auto font-semibold tabular-nums">{formatNumber(current)}</span>
      </div>

      {previous != null && (
        <div className="flex items-center gap-2 mt-0.5">
          <span className="w-2 h-2 rounded-full bg-[var(--theme-elevation-500)] outline outline-1 outline-dashed outline-[var(--theme-elevation-500)]" />
          <span>Previous</span>
          <span className="ml-auto text-[var(--theme-elevation-500)] tabular-nums">{formatNumber(previous)}</span>
        </div>
      )}
    </div>
  );
}

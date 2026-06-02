"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatShortDate } from "../numberFormatters";
import { TrendTooltip } from "./TrendTooltip";
import type { KpiSeriesPoint } from "../../../types/query";
import type { TrendMetric } from "./TrendChart";

interface Props {
  series: KpiSeriesPoint[];
  comparisonSeries?: KpiSeriesPoint[];
  metric: TrendMetric;
}

export function TrendChartInner({ series, comparisonSeries, metric }: Props) {
  const merged = series.map((p, i) => ({
    date: p.date,
    current: p[metric],
    previous: comparisonSeries?.[i]?.[metric] ?? null,
    previousDate: comparisonSeries?.[i]?.date,
  }));

  const showCompare = (comparisonSeries?.length ?? 0) > 0;

  return (
    <div data-testid="trend-chart-inner" className="relative h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={merged} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-elevation-100)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={(v: string) => formatShortDate(v)} stroke="var(--theme-elevation-500)" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis hide />
          <Tooltip content={<TrendTooltip metric={metric} />} cursor={{ stroke: "var(--theme-elevation-300)", strokeDasharray: "2 2" }} />
          <Line type="monotone" dataKey="current" stroke="var(--theme-elevation-1000)" strokeWidth={2} dot={false} isAnimationActive={false} />
          {showCompare && <Line type="monotone" dataKey="previous" stroke="var(--theme-elevation-500)" strokeDasharray="4 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

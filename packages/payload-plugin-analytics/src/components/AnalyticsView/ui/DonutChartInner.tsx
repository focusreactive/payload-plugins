"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { formatCompactNumber, formatNumber } from "../numberFormatters";
import type { DonutSlice } from "./DonutChart";

const COLORS = [
  "var(--theme-elevation-800)",
  "var(--theme-elevation-500)",
  "var(--theme-elevation-300)",
  "var(--theme-elevation-200)",
];

export function DonutChartInner({ data, centerCaption }: { data: DonutSlice[]; centerCaption: string }) {
  const total = data.reduce((a, d) => a + d.value, 0);

  return (
    <div data-testid="donut-chart-inner" className="flex flex-col items-center gap-4 py-2">
      <div className="relative w-[168px] h-[168px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={50} outerRadius={72} stroke="none" isAnimationActive={false}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]!} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold text-[var(--theme-elevation-1000)]">{formatCompactNumber(total)}</span>
          <span className="text-[9px] tracking-widest text-[var(--theme-elevation-500)] font-medium">
            {centerCaption}
          </span>
        </div>
      </div>

      <div className="flex flex-row flex-wrap justify-center gap-4 w-full text-xs">
        {data.map(({ label, value, icon: Icon }, i) => {
          const percent = total === 0 ? 0 : (value / total) * 100;

          return (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
              {Icon && <Icon size={12} className="text-[var(--theme-elevation-700)]" />}
              <span>{label}</span>
              <span className="font-semibold tabular-nums">{formatNumber(value)}</span>
              <span className="text-[var(--theme-elevation-500)] text-[11px]">{percent.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

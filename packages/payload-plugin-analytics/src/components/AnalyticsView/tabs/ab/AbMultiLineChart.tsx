"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { getBucketColor, getBucketLabel, formatDayShort } from "./format";
import type { AbTimeSeriesResponse, AbTimeSeriesDay } from "../../../../types/ab";

const conversionRate = (d: AbTimeSeriesDay) =>
  d.cumulativeSessions > 0 ? d.cumulativeConvertingSessions / d.cumulativeSessions : 0;

interface LineMeta {
  bucket: string;
  label: string;
  color: string;
  strokeWidth: number;
}

interface TooltipProps {
  active?: boolean;
  label?: string;
  lines: LineMeta[];
  payload?: Array<{ payload: Record<string, number | string> }>;
}

function ChartTooltip({ active, payload, label, lines }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]!.payload;

  return (
    <div className="pointer-events-none z-[4] min-w-[130px] rounded-(--style-radius-s) border border-(--theme-border-color) bg-(--theme-elevation-0) px-2.5 py-2 text-[11.5px] shadow-popover">
      <div className="mb-[5px] font-[family-name:var(--font-mono)] text-[10px] text-(--theme-elevation-500)">
        {formatDayShort(String(label))}
      </div>
      {lines.map((ln) => (
        <div key={ln.bucket} className="flex items-center gap-[7px] py-px">
          <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: ln.color }} />
          <span className="truncate" style={{ maxWidth: 90 }}>
            {ln.label}
          </span>
          <span className="ml-auto font-semibold tabular-nums">
            {((Number(row[ln.bucket]) || 0) * 100).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export function AbMultiLineChart({ data }: { data: AbTimeSeriesResponse }) {
  const series = data.series;
  const n = series[0]?.days.length ?? 0;

  if (!series.length || n === 0) {
    return (
      <div className="relative grid h-[240px] place-items-center text-(--theme-elevation-500)">No data in range</div>
    );
  }

  const lines: LineMeta[] = series.map((s, si) => ({
    bucket: s.bucket,
    label: getBucketLabel(s.bucket, s.name),
    color: getBucketColor(si),
    strokeWidth: si === 0 ? 1.8 : 2,
  }));

  const rows = series[0]!.days.map((_, i) => {
    const row: Record<string, number | string> = { date: series[0]!.days[i]!.date };
    series.forEach((s) => {
      row[s.bucket] = conversionRate(s.days[i]!);
    });
    return row;
  });

  let maxCr = 0;
  series.forEach((s) =>
    s.days.forEach((d) => {
      const v = conversionRate(d);
      if (v > maxCr) maxCr = v;
    }),
  );
  const yMax = Math.max(0.02, maxCr * 1.18);

  // significance markers: skip control (index 0), drop unresolved or first-day dates
  const sigLines = series
    .map((s, si) => {
      if (si === 0) return null;
      const sigDate = data.significanceDates[s.bucket];
      if (!sigDate) return null;
      const idx = s.days.findIndex((d) => d.date === sigDate);
      if (idx <= 0) return null;
      return { date: sigDate, color: getBucketColor(si) };
    })
    .filter((v): v is { date: string; color: string } => v !== null);

  return (
    <div className="relative h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 16, right: 14, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-elevation-100)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => formatDayShort(v)}
            stroke="var(--theme-elevation-500)"
            fontSize={9}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            domain={[0, yMax]}
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
            stroke="var(--theme-elevation-500)"
            fontSize={9}
            tickLine={false}
            axisLine={false}
            width={38}
          />
          <Tooltip
            content={<ChartTooltip lines={lines} />}
            cursor={{ stroke: "var(--theme-elevation-300)", strokeDasharray: "2 2" }}
          />
          {sigLines.map((s) => (
            <ReferenceLine
              key={`sig-${s.date}-${s.color}`}
              x={s.date}
              stroke={s.color}
              strokeWidth={1.2}
              strokeDasharray="3 3"
              opacity={0.8}
              label={{ value: "p<.05", position: "top", fill: s.color, fontSize: 9, fontWeight: 600 }}
            />
          ))}
          {lines.map((ln) => (
            <Line
              key={ln.bucket}
              type="monotone"
              dataKey={ln.bucket}
              stroke={ln.color}
              strokeWidth={ln.strokeWidth}
              strokeLinejoin="round"
              dot={false}
              activeDot={{ r: 3.5, strokeWidth: 2, fill: "var(--theme-elevation-0)", stroke: ln.color }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

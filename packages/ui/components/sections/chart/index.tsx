"use client";

import { useId, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipProps } from "recharts";

import { cn } from "../../../utils";

interface ChartDataPoint {
  label: string;
  value: number;
}

interface ChartRange {
  label: string;
  dataPoints: ChartDataPoint[];
}

export interface ChartProps {
  title: string;
  subtitle?: string | null;
  ranges: ChartRange[];
}

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!(active && payload?.length)) return null;

  const value = payload[0]?.value;

  return (
    <div className="rounded-sm border border-border bg-surface px-3 py-2 shadow-lg">
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-foreground tabular-nums">{typeof value === "number" ? value.toLocaleString("en-US") : value}</p>
    </div>
  );
}

interface RangeTabProps {
  label: string;
  isActive: boolean;
  onSelect: () => void;
}

function RangeTab({ label, isActive, onSelect }: RangeTabProps) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onSelect}
      className={cn(
        "cursor-pointer rounded-pill border-none px-[15px] py-2 text-[0.82rem] font-semibold whitespace-nowrap",
        "transition-colors duration-150 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "text-muted-foreground hover:text-foreground",
        isActive && "bg-surface"
      )}
    >
      {label}
    </button>
  );
}

export function Chart({ title, subtitle, ranges }: ChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const gradientId = useId();

  if (!ranges?.length) return null;

  const activeRange = ranges[Math.min(activeIndex, ranges.length - 1)];
  const data = activeRange?.dataPoints ?? [];
  const firstLabel = data[0]?.label;
  const lastLabel = data.at(-1)?.label;

  return (
    <div className="not-prose rounded-md border border-border bg-surface p-[clamp(18px,3vw,30px)]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-h-card text-foreground">{title}</h3>
          {subtitle ? <p className="mt-1 text-small text-muted-foreground">{subtitle}</p> : null}
        </div>

        {ranges.length > 1 ? (
          <div className="inline-flex gap-0.5 rounded-pill border border-border bg-surface-muted p-1" role="group" aria-label="Select range">
            {ranges.map((range, i) => (
              <RangeTab key={range.label} label={range.label} isActive={i === activeIndex} onSelect={() => setActiveIndex(i)} />
            ))}
          </div>
        ) : null}
      </div>

      <div className="h-[clamp(220px,30vw,320px)] w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid vertical={false} horizontal stroke="var(--color-border)" strokeWidth={1} />

              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                ticks={firstLabel && lastLabel ? [firstLabel, lastLabel] : undefined}
                interval="preserveStartEnd"
                tickMargin={12}
                tickFormatter={(value: string) => value.toUpperCase()}
                tick={{
                  fill: "var(--color-muted-foreground)",
                  fontSize: "0.66rem",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.04em",
                }}
              />

              <YAxis hide domain={["auto", "auto"]} />

              <Tooltip
                content={<ChartTooltip />}
                cursor={{
                  stroke: "var(--color-border-strong)",
                  strokeWidth: 1,
                }}
              />

              <Area type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2} fill={`url(#${gradientId})`} isAnimationActive />
            </AreaChart>
          </ResponsiveContainer>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useId, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";

import { cn } from "@/components/utils";

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
    <div className="rounded-md border border-border-strong bg-popover px-4 py-3 shadow-popover">
      <p className="text-caption text-subtle-foreground">{label}</p>
      <p className="mt-1 text-body font-semibold text-foreground tabular-nums">
        {typeof value === "number" ? value.toLocaleString("en-US") : value}
      </p>
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
        "cursor-pointer rounded-pill border px-4 py-2.5 text-small whitespace-nowrap text-foreground md:px-6 md:py-3 md:text-body md:leading-5",
        "transition-[border-color,background-color,box-shadow,opacity] duration-200 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        isActive ? "border-brand bg-surface shadow-glow-tab" : "border-transparent hover:opacity-70"
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

  return (
    <div className="not-prose flex flex-col gap-8 overflow-clip rounded-2xl border border-border bg-surface p-6 md:gap-10 md:p-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h3 className="text-h-item text-foreground">{title}</h3>
          {subtitle ? <p className="text-body text-subtle-foreground">{subtitle}</p> : null}
        </div>

        {ranges.length > 1 ? (
          <div
            className="inline-flex max-w-full overflow-x-auto rounded-pill border border-border bg-surface p-1 backdrop-blur-glass-sm scrollbar-none"
            role="group"
            aria-label="Select range"
          >
            {ranges.map((range, i) => (
              <RangeTab
                key={range.label}
                label={range.label}
                isActive={i === activeIndex}
                onSelect={() => setActiveIndex(i)}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="h-[clamp(260px,32.4vw,466px)] w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-brand-glow)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid vertical horizontal stroke="var(--color-border)" strokeWidth={1} />

              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
                tickMargin={12}
                tick={{
                  fill: "var(--color-subtle-foreground)",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-sans)",
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

              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--color-foreground)"
                strokeWidth={1.5}
                fill={`url(#${gradientId})`}
                isAnimationActive
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : null}
      </div>
    </div>
  );
}

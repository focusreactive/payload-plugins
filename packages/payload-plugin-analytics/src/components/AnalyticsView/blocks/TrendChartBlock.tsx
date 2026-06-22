"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { useKpisQuery } from "../hooks/queries/useKpisQuery";
import { DataCard } from "../ui/DataCard";
import { MetricSwitcher } from "../ui/MetricSwitcher";
import { TrendChart } from "../ui/TrendChart";
import type { TrendMetric } from "../ui/TrendChart";
import type { BlockComponentProps } from "../../../types/layout";

export function TrendChartBlock({ dateRange, comparison, className }: BlockComponentProps) {
  const [metric, setMetric] = useState<TrendMetric>("sessions");
  const { data, isLoading, error } = useKpisQuery({ dateRange, comparison });
  const showCompare = comparison.kind === "previous-period";

  return (
    <DataCard
      title="Trend"
      icon={TrendingUp}
      className={className}
      action={
        <MetricSwitcher
          value={metric}
          onChange={setMetric}
          options={[
            { value: "sessions", label: "Sessions" },
            { value: "users", label: "Users" },
            { value: "pageViews", label: "Pageviews" },
            { value: "bounceRate", label: "Bounce rate" },
            { value: "avgSessionDuration", label: "Average duration" },
          ]}
        />
      }
    >
      <div className="flex items-center gap-4 mb-3">
        <div className="flex gap-3.5 text-[11px] text-[var(--theme-elevation-500)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-0 border-t-2 border-[var(--theme-elevation-800)]" /> Current
          </span>
          {showCompare && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-0 border-t-2 border-dashed border-[var(--theme-elevation-500)]" />{" "}
              Previous period
            </span>
          )}
        </div>
      </div>
      <TrendChart
        series={data?.series ?? []}
        comparisonSeries={showCompare ? data?.comparisonSeries : undefined}
        metric={metric}
        loading={isLoading}
        error={error ?? undefined}
      />
    </DataCard>
  );
}

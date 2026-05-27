"use client";

import { Clock } from "lucide-react";
import { useKpisQuery } from "../hooks/queries/useKpisQuery";
import { KpiCard } from "../ui/KpiCard";
import { formatDuration } from "../numberFormatters";
import type { BlockComponentProps } from "../../../types/layout";

export function AvgDurationKpiBlock({ dateRange, comparison }: BlockComponentProps) {
  const { data, isLoading, error } = useKpisQuery({ dateRange, comparison });
  const showCompare = comparison.kind === "previous-period";

  return (
    <KpiCard
      label="Avg duration"
      icon={Clock}
      value={data?.current.avgSessionDuration ?? 0}
      format={formatDuration}
      prevValue={showCompare ? (data?.comparison?.avgSessionDuration ?? null) : null}
      loading={isLoading}
      error={error ?? undefined}
    />
  );
}

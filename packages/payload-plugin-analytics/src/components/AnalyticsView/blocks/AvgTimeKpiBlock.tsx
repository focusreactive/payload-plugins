"use client";

import { Clock } from "lucide-react";
import { useLeadActionsQuery } from "../hooks/queries/useLeadActionsQuery";
import { KpiCard } from "../ui/KpiCard";
import { formatDuration } from "../numberFormatters";
import type { BlockComponentProps } from "../../../types/layout";

export function AvgTimeKpiBlock({ dateRange, comparison, className }: BlockComponentProps) {
  const { data, isLoading, error } = useLeadActionsQuery({ dateRange, comparison });
  const showCompare = comparison.kind === "previous-period";

  return (
    <KpiCard
      label="Avg time to action"
      icon={Clock}
      value={data?.current.avgTimeToAction ?? 0}
      format={formatDuration}
      invertDelta
      prevValue={showCompare ? (data?.comparison?.avgTimeToAction ?? null) : null}
      missing={data?.missing?.filter((k) => k === "fr_elapsed_ms")}
      loading={isLoading}
      error={error ?? undefined}
      className={className}
    />
  );
}

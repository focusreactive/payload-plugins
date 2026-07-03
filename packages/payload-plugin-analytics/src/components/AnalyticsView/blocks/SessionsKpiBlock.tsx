"use client";

import { Activity } from "lucide-react";
import { useKpisQuery } from "../hooks/queries/useKpisQuery";
import { KpiCard } from "../ui/KpiCard";
import { formatNumber } from "../numberFormatters";
import type { BlockComponentProps } from "../../../types/layout";

export function SessionsKpiBlock({ dateRange, comparison, className }: BlockComponentProps) {
  const { data, isLoading, isPlaceholderData, error } = useKpisQuery({ dateRange, comparison });
  const showCompare = comparison.kind === "previous-period";

  return (
    <KpiCard
      label="Sessions"
      icon={Activity}
      value={data?.current.sessions ?? 0}
      format={formatNumber}
      prevValue={showCompare ? (data?.comparison?.sessions ?? null) : null}
      loading={isLoading}
      refreshing={isPlaceholderData}
      error={error ?? undefined}
      className={className}
    />
  );
}

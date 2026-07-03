"use client";

import { Eye } from "lucide-react";
import { useKpisQuery } from "../hooks/queries/useKpisQuery";
import { KpiCard } from "../ui/KpiCard";
import { formatNumber } from "../numberFormatters";
import type { BlockComponentProps } from "../../../types/layout";

export function PageviewsKpiBlock({ dateRange, comparison, className }: BlockComponentProps) {
  const { data, isLoading, isPlaceholderData, error } = useKpisQuery({ dateRange, comparison });
  const showCompare = comparison.kind === "previous-period";

  return (
    <KpiCard
      label="Pageviews"
      icon={Eye}
      value={data?.current.pageViews ?? 0}
      format={formatNumber}
      prevValue={showCompare ? (data?.comparison?.pageViews ?? null) : null}
      loading={isLoading}
      refreshing={isPlaceholderData}
      error={error ?? undefined}
      className={className}
    />
  );
}

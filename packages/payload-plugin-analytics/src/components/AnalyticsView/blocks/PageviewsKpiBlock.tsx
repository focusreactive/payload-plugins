"use client";

import { Eye } from "lucide-react";
import { useKpisQuery } from "../hooks/queries/useKpisQuery";
import { KpiCard } from "../ui/KpiCard";
import { formatNumber } from "../numberFormatters";
import type { BlockComponentProps } from "../../../types/layout";

export function PageviewsKpiBlock({ dateRange, comparison }: BlockComponentProps) {
  const { data, isLoading, error } = useKpisQuery({ dateRange, comparison });
  const showCompare = comparison.kind === "previous-period";

  return (
    <KpiCard
      label="Pageviews"
      icon={Eye}
      value={data?.current.pageViews ?? 0}
      format={formatNumber}
      prevValue={showCompare ? (data?.comparison?.pageViews ?? null) : null}
      loading={isLoading}
      error={error ?? undefined}
    />
  );
}

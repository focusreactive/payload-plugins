"use client";

import { ArrowDown } from "lucide-react";
import { useKpisQuery } from "../hooks/queries/useKpisQuery";
import { KpiCard } from "../ui/KpiCard";
import { formatPercentage } from "../numberFormatters";
import type { BlockComponentProps } from "../../../types/layout";

export function BounceRateKpiBlock({ dateRange, comparison, className }: BlockComponentProps) {
  const { data, isLoading, error } = useKpisQuery({ dateRange, comparison });
  const showCompare = comparison.kind === "previous-period";

  return (
    <KpiCard
      label="Bounce rate"
      icon={ArrowDown}
      value={data?.current.bounceRate ?? 0}
      format={formatPercentage}
      invertDelta
      prevValue={showCompare ? (data?.comparison?.bounceRate ?? null) : null}
      loading={isLoading}
      error={error ?? undefined}
      className={className}
    />
  );
}

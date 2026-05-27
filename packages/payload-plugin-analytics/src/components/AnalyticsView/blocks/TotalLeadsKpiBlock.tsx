"use client";

import { Zap } from "lucide-react";
import { useLeadActionsQuery } from "../hooks/queries/useLeadActionsQuery";
import { KpiCard } from "../ui/KpiCard";
import { formatNumber } from "../numberFormatters";
import type { BlockComponentProps } from "../../../types/layout";

function sumTotals(totals?: Record<string, number>) {
  if (!totals) return 0;
  return Object.values(totals).reduce((a, b) => a + b, 0);
}

export function TotalLeadsKpiBlock({ dateRange, comparison }: BlockComponentProps) {
  const { data, isLoading, error } = useLeadActionsQuery({ dateRange, comparison });
  const showCompare = comparison.kind === "previous-period";
  const cur = sumTotals(data?.current.totals);
  const prev = sumTotals(data?.comparison?.totals);

  return (
    <KpiCard
      label="Total leads"
      icon={Zap}
      value={cur}
      format={formatNumber}
      prevValue={showCompare ? prev : null}
      loading={isLoading}
      error={error ?? undefined}
    />
  );
}

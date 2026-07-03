"use client";

import { TrendingUp } from "lucide-react";
import { useKpisQuery } from "../hooks/queries/useKpisQuery";
import { useLeadActionsQuery } from "../hooks/queries/useLeadActionsQuery";
import { KpiCard } from "../ui/KpiCard";
import { formatPercentage } from "../numberFormatters";
import type { BlockComponentProps } from "../../../types/layout";

function sumTotals(totals?: Record<string, number>) {
  if (!totals) return 0;
  return Object.values(totals).reduce((a, b) => a + b, 0);
}

export function ConversionRateKpiBlock({ dateRange, comparison, className }: BlockComponentProps) {
  const kpis = useKpisQuery({ dateRange, comparison });
  const lead = useLeadActionsQuery({ dateRange, comparison });
  const showCompare = comparison.kind === "previous-period";
  const sessions = kpis.data?.current.sessions ?? 0;
  const totalLeads = sumTotals(lead.data?.current.totals);
  const prevLeads = sumTotals(lead.data?.comparison?.totals);

  const value = sessions ? totalLeads / sessions : 0;
  const prevValue = showCompare && sessions ? prevLeads / sessions : null;

  return (
    <KpiCard
      label="Conversion rate"
      icon={TrendingUp}
      value={value}
      format={formatPercentage}
      prevValue={prevValue}
      loading={kpis.isLoading || lead.isLoading}
      refreshing={kpis.isPlaceholderData || lead.isPlaceholderData}
      error={lead.error ?? undefined}
      className={className}
    />
  );
}

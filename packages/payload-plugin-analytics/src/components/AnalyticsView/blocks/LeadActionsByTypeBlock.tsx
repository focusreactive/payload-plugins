"use client";

import { BarChart3 } from "lucide-react";
import { useLeadActionsQuery } from "../hooks/queries/useLeadActionsQuery";
import { useLeadActionRegistry } from "../contexts/LeadActionRegistryContext";
import { DataCard } from "../ui/DataCard";
import { BarList } from "../ui/BarList";
import { SetupRequiredCard } from "../ui/SetupRequiredCard";
import { formatNumber } from "../numberFormatters";
import type { BlockComponentProps } from "../../../types/layout";

export function LeadActionsByTypeBlock({ dateRange, comparison, className }: BlockComponentProps) {
  const { resolveLabel, resolveIcon } = useLeadActionRegistry();
  const { data, isLoading, error } = useLeadActionsQuery({ dateRange, comparison });
  const showCompare = comparison.kind === "previous-period";
  const cur = data?.current;
  const prev = data?.comparison;

  const rows = cur
    ? (Object.entries(cur.totals) as Array<[string, number]>)
        .sort((a, b) => b[1] - a[1])
        .map(([kind, value]) => ({
          label: resolveLabel(kind),
          value,
          prev: showCompare ? (prev?.totals[kind] ?? undefined) : undefined,
          kind,
        }))
    : [];

  return (
    <DataCard title="Lead actions by type" icon={BarChart3} className={className}>
      {data?.missing?.includes("fr_lead_type") ? (
        <SetupRequiredCard missingKeys={["fr_lead_type"]} />
      ) : (
        <BarList
          rows={rows}
          getIcon={(r) => resolveIcon(r.kind)}
          initialVisible={5}
          format={formatNumber}
          loading={isLoading}
          error={error ?? undefined}
        />
      )}
    </DataCard>
  );
}

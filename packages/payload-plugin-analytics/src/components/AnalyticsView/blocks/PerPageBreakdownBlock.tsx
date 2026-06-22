"use client";

import { FileText } from "lucide-react";
import { useLeadActionsQuery } from "../hooks/queries/useLeadActionsQuery";
import { DataCard } from "../ui/DataCard";
import { BarList } from "../ui/BarList";
import { LeadActionsPerPageTable } from "../tabs/LeadActionsPerPageTable";
import type { BlockComponentProps } from "../../../types/layout";

export function PerPageBreakdownBlock({ dateRange, comparison, className }: BlockComponentProps) {
  const { data, isLoading, error } = useLeadActionsQuery({ dateRange, comparison });
  const showCompare = comparison.kind === "previous-period";
  const prevByPagePath = new Map(
    (data?.comparison?.perPage ?? []).map((p) => [p.pagePath, p.counts])
  );

  return (
    <DataCard title="Per-page breakdown" icon={FileText} className={className}>
      {isLoading || error ? (
        <BarList rows={[]} loading={isLoading} error={error ?? undefined} />
      ) : (
        <LeadActionsPerPageTable
          rows={data?.current.perPage ?? []}
          prevByPagePath={showCompare ? prevByPagePath : undefined}
        />
      )}
    </DataCard>
  );
}

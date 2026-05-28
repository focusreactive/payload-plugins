"use client";

import { Route } from "lucide-react";
import { useJourneysQuery } from "../hooks/queries/useJourneysQuery";
import { DataCard } from "../ui/DataCard";
import { ChainList } from "../ui/ChainList";
import { SetupRequiredCard } from "../ui/SetupRequiredCard";
import { formatNumber } from "../numberFormatters";
import type { BlockComponentProps } from "../../../types/layout";

const LIMIT = 20;
const MAX_STEPS = 8;

export function DiscoveryPathsBlock({ dateRange, comparison, className }: BlockComponentProps) {
  const { data, isLoading, error } = useJourneysQuery({
    dateRange,
    comparison,
    limit: LIMIT,
    maxSteps: MAX_STEPS,
  });

  return (
    <DataCard
      title="Discovery paths"
      icon={Route}
      className={className}
      action={
        data && (
          <span className="flex items-center gap-2 text-[11px] text-[var(--theme-elevation-500)]">
            <span>
              Top {data.rows.length} chains · {formatNumber(data.sessionsConsidered)} sessions analysed
            </span>
            {data.truncated && (
              <span className="inline-flex items-center px-1.5 py-px rounded-full border border-[var(--theme-warning-200)] text-[var(--theme-warning-700)] bg-[var(--theme-warning-50)] text-[10px]">
                Truncated
              </span>
            )}
          </span>
        )
      }>
      {data?.setupRequired ?
        <SetupRequiredCard missingKeys={data.missing ?? ["fr_session_id"]} />
      : <ChainList rows={data?.rows ?? []} loading={isLoading} error={error ?? undefined} />}
    </DataCard>
  );
}

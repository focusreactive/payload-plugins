"use client";

import { Globe } from "lucide-react";
import { useTopSourcesQuery } from "../hooks/queries/useTopSourcesQuery";
import { DataCard } from "../ui/DataCard";
import { TopNTable } from "../ui/TopNTable";
import { formatNumber } from "../numberFormatters";
import type { TopSourcesRow } from "../../../types/query";
import type { BlockComponentProps } from "../../../types/layout";

const LIMIT = 10;

export function TopSourcesBlock({ dateRange, comparison, className }: BlockComponentProps) {
  const { data, isLoading, error } = useTopSourcesQuery({ dateRange, comparison, limit: LIMIT });
  const showCompare = comparison.kind === "previous-period";
  const prev = new Map((data?.comparison?.rows ?? []).map((r) => [`${r.source}|${r.medium}`, r]));

  return (
    <DataCard title="Top sources" icon={Globe} className={className}>
      <TopNTable<TopSourcesRow>
        rows={data?.rows ?? []}
        loading={isLoading}
        error={error ?? undefined}
        columns={[
          {
            key: "source",
            header: "Source / medium",
            truncate: true,
            render: (r) => (
              <div className="flex flex-col min-w-0">
                <span className="truncate">
                  {r.source} / {r.medium}
                </span>
                <span className="text-[var(--theme-elevation-500)] text-[11px] truncate">
                  {r.channel}
                </span>
              </div>
            ),
          },
          {
            key: "sessions",
            header: "Sessions",
            align: "right",
            value: (r) => r.sessions,
            prevValue: showCompare
              ? (r) => prev.get(`${r.source}|${r.medium}`)?.sessions ?? null
              : undefined,
            format: formatNumber,
          },
        ]}
      />
    </DataCard>
  );
}

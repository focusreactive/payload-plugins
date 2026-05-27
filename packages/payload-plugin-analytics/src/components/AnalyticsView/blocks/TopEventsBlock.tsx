"use client";

import { Sparkles } from "lucide-react";
import { useTopEventsQuery } from "../hooks/queries/useTopEventsQuery";
import { DataCard } from "../ui/DataCard";
import { TopNTable } from "../ui/TopNTable";
import { formatNumber } from "../numberFormatters";
import type { TopEventsRow } from "../../../types/query";
import type { BlockComponentProps } from "../../../types/layout";

const LIMIT = 10;

export function TopEventsBlock({ dateRange, comparison }: BlockComponentProps) {
  const { data, isLoading, error } = useTopEventsQuery({ dateRange, comparison, limit: LIMIT });
  const showCompare = comparison.kind === "previous-period";
  const prev = new Map((data?.comparison?.rows ?? []).map((r) => [r.eventName, r]));

  return (
    <DataCard title="Top events" icon={Sparkles}>
      <TopNTable<TopEventsRow>
        rows={data?.rows ?? []}
        loading={isLoading}
        error={error ?? undefined}
        columns={[
          { key: "eventName", header: "Event", font: "mono", render: (r) => r.eventName },
          {
            key: "eventCount",
            header: "Count",
            align: "right",
            value: (r) => r.eventCount,
            prevValue: showCompare ? (r) => prev.get(r.eventName)?.eventCount ?? null : undefined,
            format: formatNumber,
          },
          {
            key: "eventCountPerUser",
            header: "Count per user",
            align: "right",
            value: (r) => r.eventCountPerUser,
            prevValue: showCompare ? (r) => prev.get(r.eventName)?.eventCountPerUser ?? null : undefined,
            format: (n) => n.toFixed(2),
          },
        ]}
      />
    </DataCard>
  );
}

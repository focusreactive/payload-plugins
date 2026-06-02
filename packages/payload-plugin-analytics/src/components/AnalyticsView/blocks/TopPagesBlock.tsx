"use client";

import { FileText } from "lucide-react";
import { useTopPagesQuery } from "../hooks/queries/useTopPagesQuery";
import { DataCard } from "../ui/DataCard";
import { TopNTable } from "../ui/TopNTable";
import { formatDuration, formatNumber } from "../numberFormatters";
import type { TopPagesRow } from "../../../types/query";
import type { BlockComponentProps } from "../../../types/layout";

const LIMIT = 10;

export function TopPagesBlock({ dateRange, comparison, className }: BlockComponentProps) {
  const { data, isLoading, error } = useTopPagesQuery({ dateRange, comparison, limit: LIMIT });
  const showCompare = comparison.kind === "previous-period";
  const prev = new Map((data?.comparison?.rows ?? []).map((r) => [r.pagePath, r]));

  return (
    <DataCard title="Top pages" icon={FileText} className={className}>
      <TopNTable<TopPagesRow>
        rows={data?.rows ?? []}
        loading={isLoading}
        error={error ?? undefined}
        columns={[
          {
            key: "pagePath",
            header: "Page",
            render: (r) => (
              <div className="flex flex-col min-w-0">
                <span className="font-[family-name:var(--font-mono)] truncate text-xs" title={r.pagePath}>
                  {r.pagePath}
                </span>
                <span className="text-[var(--theme-elevation-500)] text-[11px] truncate">{r.pageTitle}</span>
              </div>
            ),
          },
          {
            key: "pageViews",
            header: "Views",
            align: "right",
            value: (r) => r.pageViews,
            prevValue: showCompare ? (r) => prev.get(r.pagePath)?.pageViews ?? null : undefined,
            format: formatNumber,
          },
          {
            key: "avgTime",
            header: "Avg",
            align: "right",
            value: (r) => r.avgTime,
            prevValue: showCompare ? (r) => prev.get(r.pagePath)?.avgTime ?? null : undefined,
            format: formatDuration,
          },
        ]}
      />
    </DataCard>
  );
}

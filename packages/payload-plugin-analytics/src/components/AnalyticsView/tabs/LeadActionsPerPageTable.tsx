"use client";

import { Fragment, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../../../utils/style";
import { BarList } from "../ui/BarList";
import { Metric } from "../ui/Metric";
import { useLeadActionRegistry } from "../contexts/LeadActionRegistryContext";
import { formatNumber } from "../numberFormatters";
import { EmptyTile } from "../ui/EmptyTile";

export interface PerPageRow {
  pagePath: string;
  counts: Record<string, number>;
}

export interface LeadActionsPerPageTableProps {
  rows: PerPageRow[];
  prevByPagePath?: Map<string, Record<string, number>>;
}

export function LeadActionsPerPageTable({ rows, prevByPagePath }: LeadActionsPerPageTableProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const { resolveLabel, resolveIcon } = useLeadActionRegistry();

  if (rows.length === 0) return <EmptyTile message="No data in this range." />;

  return (
    <table className="w-full border-collapse text-[12.5px]">
      <thead>
        <tr>
          <th className="text-left p-2 text-[10px] tracking-widest uppercase text-[var(--theme-elevation-500)] font-semibold border-b border-[var(--theme-border-color)]">
            Page
          </th>
          <th className="text-right p-2 text-[10px] tracking-widest uppercase text-[var(--theme-elevation-500)] font-semibold border-b border-[var(--theme-border-color)]">
            Leads
          </th>
          <th className="text-left p-2 text-[10px] tracking-widest uppercase text-[var(--theme-elevation-500)] font-semibold border-b border-[var(--theme-border-color)]">
            Top actions
          </th>
          <th style={{ width: 30 }} className="border-b border-[var(--theme-border-color)]" />
        </tr>
      </thead>

      <tbody>
        {rows.map((r, i) => {
          const sorted = Object.entries(r.counts) as Array<[string, number]>;
          sorted.sort((a, b) => b[1] - a[1]);
          const top3 = sorted.slice(0, 3);
          const total = sorted.reduce((acc, [, v]) => acc + v, 0);
          const prevCounts = prevByPagePath?.get(r.pagePath);
          const prevTotal = prevCounts
            ? Object.values(prevCounts).reduce((a, b) => a + (b ?? 0), 0)
            : null;
          const isOpen = !!open[r.pagePath];

          return (
            <Fragment key={i}>
              <tr
                onClick={() => setOpen((o) => ({ ...o, [r.pagePath]: !o[r.pagePath] }))}
                className="cursor-pointer hover:bg-[var(--theme-elevation-50)]"
              >
                <td className="p-2 border-b border-[var(--theme-elevation-100)] font-[family-name:var(--font-mono)] text-xs">
                  {r.pagePath}
                </td>

                <td className="p-2 border-b border-[var(--theme-elevation-100)] text-right">
                  <span className="inline-flex justify-end">
                    <Metric
                      value={total}
                      prevValue={prevTotal}
                      format={formatNumber}
                      mode="inline"
                    />
                  </span>
                </td>

                <td className="p-2 border-b border-[var(--theme-elevation-100)]">
                  <div className="flex gap-2 flex-wrap">
                    {top3.map(([kind, count]) => {
                      const Icon = resolveIcon(kind);
                      const prevCount = prevCounts?.[kind] ?? null;
                      return (
                        <Metric
                          key={kind}
                          value={count}
                          prevValue={prevCount}
                          format={formatNumber}
                          icon={Icon}
                          mode="chip"
                        />
                      );
                    })}
                  </div>
                </td>

                <td className="p-2 border-b border-[var(--theme-elevation-100)] text-right">
                  <ChevronRight
                    size={14}
                    className={cn(
                      "text-[var(--theme-elevation-500)] transition-transform",
                      isOpen && "rotate-90"
                    )}
                  />
                </td>
              </tr>

              {isOpen && (
                <tr>
                  <td
                    colSpan={4}
                    className="bg-[var(--theme-elevation-50)] p-4 border-b border-[var(--theme-elevation-100)]"
                  >
                    <BarList
                      rows={sorted.map(([kind, value]) => ({
                        label: resolveLabel(kind),
                        value,
                        prev: prevCounts?.[kind] ?? undefined,
                        kind,
                      }))}
                      getIcon={(row) => resolveIcon((row as { kind: string }).kind)}
                      initialVisible={10}
                      format={formatNumber}
                    />
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

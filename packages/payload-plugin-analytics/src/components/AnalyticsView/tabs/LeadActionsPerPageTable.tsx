"use client";

import { Fragment, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../../../utils/style";
import { BarList } from "../ui/BarList";
import { getLeadActionIcon, LEAD_ACTION_LABELS } from "../icons";
import { formatNumber } from "../numberFormatters";
import type { LeadActionKind } from "../../../types/events";
import { EmptyTile } from "../ui/EmptyTile";

export interface PerPageRow {
  pagePath: string;
  counts: Partial<Record<LeadActionKind, number>>;
}

export function LeadActionsPerPageTable({ rows }: { rows: PerPageRow[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

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
          const sorted = Object.entries(r.counts) as Array<[LeadActionKind, number]>;
          sorted.sort((a, b) => b[1] - a[1]);
          const top3 = sorted.slice(0, 3);
          const total = sorted.reduce((acc, [, v]) => acc + v, 0);
          const isOpen = !!open[r.pagePath];

          return (
            <Fragment key={i}>
              <tr
                onClick={() => setOpen((o) => ({ ...o, [r.pagePath]: !o[r.pagePath] }))}
                className="cursor-pointer hover:bg-[var(--theme-elevation-50)]">
                <td className="p-2 border-b border-[var(--theme-elevation-100)] font-[family-name:var(--font-mono)] text-xs">
                  {r.pagePath}
                </td>

                <td className="p-2 border-b border-[var(--theme-elevation-100)] text-right tabular-nums font-semibold">
                  {formatNumber(total)}
                </td>

                <td className="p-2 border-b border-[var(--theme-elevation-100)]">
                  <div className="flex gap-2">
                    {top3.map(([kind, count]) => {
                      const Icon = getLeadActionIcon(kind);

                      return (
                        <span
                          key={kind}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--theme-elevation-100)] text-[var(--theme-elevation-700)] text-[11px]">
                          <Icon size={11} /> {count}
                        </span>
                      );
                    })}
                  </div>
                </td>

                <td className="p-2 border-b border-[var(--theme-elevation-100)] text-right">
                  <ChevronRight
                    size={14}
                    className={cn("text-[var(--theme-elevation-500)] transition-transform", isOpen && "rotate-90")}
                  />
                </td>
              </tr>

              {isOpen && (
                <tr>
                  <td
                    colSpan={4}
                    className="bg-[var(--theme-elevation-50)] p-4 border-b border-[var(--theme-elevation-100)]">
                    <BarList
                      rows={sorted.map(([kind, value]) => ({
                        label: LEAD_ACTION_LABELS[kind],
                        value,
                        kind,
                      }))}
                      getIcon={(row) => getLeadActionIcon(row.kind)}
                      initialVisible={10}
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

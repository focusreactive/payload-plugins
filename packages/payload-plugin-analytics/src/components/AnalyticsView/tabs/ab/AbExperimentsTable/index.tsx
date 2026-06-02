"use client";

import { ChevronRight } from "lucide-react";
import { formatNumber } from "../../../numberFormatters";
import { cn } from "../../../../../utils/style";
import { LiftCell, SrmDot } from "../cells";
import { Tooltip, TooltipTitle, TooltipText, TooltipLegend, TooltipLegendRow } from "../../../ui/Tooltip";
import { formatRelativeTime } from "../format";
import type { AbExperimentListRow } from "../../../../../types/ab";
import { OutcomeBadge } from "./components/OutcomeBadge";
import { daysRunning } from "./utils/daysRunning";
import { experimentRowVariants } from "./variants";

export function AbExperimentsTable({ rows, onOpen }: { rows: AbExperimentListRow[]; onOpen: (manifestKey: string) => void }) {
  return (
    <div className="overflow-hidden rounded-(--style-radius-m) border border-(--theme-border-color) bg-(--theme-elevation-0)">
      <table className="w-full border-collapse [&_.ab-updated]:font-mono [&_.ab-updated]:text-[11px] [&_.ab-updated]:text-(--theme-elevation-500) [&_.num]:text-right [&_.num]:tabular-nums [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_td]:border-b [&_td]:border-(--theme-elevation-100) [&_td]:px-3 [&_td]:py-[11px] [&_td]:text-[13px] [&_td]:text-(--theme-elevation-900) [&_tbody_tr:hover]:bg-(--theme-elevation-50) [&_tbody_tr]:cursor-pointer [&_thead_th]:border-b [&_thead_th]:border-(--theme-border-color) [&_th:first-child]:pl-4 [&_th:last-child]:pr-4 [&_th]:px-3 [&_th]:py-[11px] [&_thead_th]:text-left [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:text-(--theme-elevation-500)">
        <thead>
          <tr>
            <th style={{ width: 120 }}>Outcome</th>
            <th>Page / path</th>
            <th style={{ width: 70 }} className="num">
              Variants
            </th>
            <th className="num" style={{ width: 96 }}>
              Days
            </th>
            <th className="num" style={{ width: 96 }}>
              Visitors
            </th>
            <th className="num" style={{ width: 108 }}>
              Conversions
            </th>
            <th className="num" style={{ width: 116 }}>
              <Tooltip
                side="bottom"
                align="end"
                width={300}
                content={
                  <>
                    <TooltipTitle>Best conversion lift</TooltipTitle>
                    <TooltipText>
                      Largest relative lift in lead-conversion rate among the variants versus the control bucket. An arrow appears once the result clears statistical significance — grey with no arrow
                      means not yet significant.
                    </TooltipText>
                  </>
                }
              >
                <span className="underline decoration-dotted decoration-(--theme-elevation-300) underline-offset-2">Best conversion lift</span>
              </Tooltip>
            </th>
            <th style={{ width: 90 }}>
              <Tooltip
                side="bottom"
                align="end"
                width={290}
                content={
                  <>
                    <TooltipTitle>Sample Ratio Mismatch</TooltipTitle>
                    <TooltipText>Chi-square test that the observed traffic split matches the configured split. A mismatch points to a bucketing or tracking bug that invalidates results.</TooltipText>
                    <TooltipLegend>
                      <TooltipLegendRow color="var(--theme-success-500)">Healthy — p ≥ 0.001</TooltipLegendRow>
                      <TooltipLegendRow color="var(--theme-error-500)">Mismatch — p &lt; 0.001</TooltipLegendRow>
                    </TooltipLegend>
                  </>
                }
              >
                <span className="underline decoration-dotted decoration-(--theme-elevation-300) underline-offset-2">Traffic split</span>
              </Tooltip>
            </th>
            <th style={{ width: 86 }} className="num">
              Updated
            </th>
            <th style={{ width: 28 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.manifestKey} onClick={() => onOpen(row.manifestKey)} className={cn(experimentRowVariants({ srmFailed: !row.srmPassed }))}>
              <td>
                <OutcomeBadge outcome={row.outcome} />
              </td>
              <td>
                <div className="flex flex-col gap-px">
                  <span className="font-mono text-[12px] text-(--theme-elevation-900)">{row.manifestKey}</span>
                  {row.parentTitle && <span className="truncate text-[11px] text-(--theme-elevation-500)">{row.parentTitle}</span>}
                </div>
              </td>
              <td className="num">{row.variantCount}</td>
              <td className="num">{daysRunning(row.startedAt)}</td>
              <td className="num">{formatNumber(row.visitors)}</td>
              <td className="num">{formatNumber(row.conversions)}</td>
              <td className="num">
                <LiftCell
                  lift={{
                    relativeLift: row.bestRelativeLift,
                    significant: row.bestSignificant,
                    pValue: row.bestPValue,
                  }}
                />
              </td>
              <td className="text-center">
                <SrmDot
                  srm={{
                    passed: row.srmPassed,
                    pValue: row.srmPValue,
                    buckets: [],
                  }}
                />
              </td>
              <td className="num ab-updated">{formatRelativeTime(row.lastUpdated)}</td>
              <td className="num">
                <ChevronRight size={14} style={{ color: "var(--theme-elevation-300)" }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

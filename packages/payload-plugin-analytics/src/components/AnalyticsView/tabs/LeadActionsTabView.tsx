"use client";

import { Zap, TrendingUp, Clock, BarChart3, FileText, Route } from "lucide-react";
import { DataCard } from "../ui/DataCard";
import { KpiCard } from "../ui/KpiCard";
import { BarList } from "../ui/BarList";
import { ChainList } from "../ui/ChainList";
import { SetupRequiredCard } from "../ui/SetupRequiredCard";
import { LeadActionsPerPageTable } from "./LeadActionsPerPageTable";
import { getLeadActionIcon, LEAD_ACTION_LABELS } from "../icons";
import { formatDuration, formatNumber, formatPercentage } from "../numberFormatters";
import type { Comparison, JourneyResponse, LeadActionsResponse } from "../../../types/query";
import type { LeadActionKind } from "../../../types/events";

export interface LeadActionsTabViewProps {
  comparison: Comparison;
  leadActions?: LeadActionsResponse;
  journeys?: JourneyResponse;
  totalSessions: number;
  loading?: Partial<Record<"kpis" | "leadActions" | "journeys", boolean>>;
  errors?: Partial<Record<"leadActions" | "journeys", Error>>;
}

function sumTotals(totals?: Record<string, number>) {
  if (!totals) return 0;

  return Object.values(totals).reduce((a, b) => a + b, 0);
}

export function LeadActionsTabView({
  comparison,
  leadActions,
  journeys,
  totalSessions,
  loading,
  errors,
}: LeadActionsTabViewProps) {
  const showCompare = comparison.kind === "previous-period";
  const cur = leadActions?.current;
  const prev = leadActions?.comparison;
  const totalLeads = sumTotals(cur?.totals);
  const prevTotalLeads = sumTotals(prev?.totals);
  const conversionRate = totalSessions ? totalLeads / totalSessions : 0;
  const prevConversionRate = totalSessions && prev ? prevTotalLeads / totalSessions : null;

  const byType =
    cur ?
      (Object.entries(cur.totals) as Array<[LeadActionKind, number]>)
        .sort((a, b) => b[1] - a[1])
        .map(([kind, value]) => ({
          label: LEAD_ACTION_LABELS[kind],
          value,
          prev: showCompare ? (prev?.totals[kind] ?? undefined) : undefined,
          kind,
        }))
    : [];

  const prevByPagePath = new Map((prev?.perPage ?? []).map((p) => [p.pagePath, p.counts]));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard
          label="Total leads"
          icon={Zap}
          value={totalLeads}
          format={formatNumber}
          prevValue={showCompare ? prevTotalLeads : null}
          loading={loading?.leadActions}
          error={errors?.leadActions}
        />

        <KpiCard
          label="Conversion rate"
          icon={TrendingUp}
          value={conversionRate}
          format={formatPercentage}
          prevValue={showCompare ? prevConversionRate : null}
          loading={loading?.kpis || loading?.leadActions}
          error={errors?.leadActions}
        />

        <KpiCard
          label="Avg time to action"
          icon={Clock}
          value={cur?.avgTimeToAction ?? 0}
          format={formatDuration}
          invertDelta
          prevValue={showCompare ? (prev?.avgTimeToAction ?? null) : null}
          missing={leadActions?.missing?.filter((k) => k === "fr_elapsed_ms")}
          loading={loading?.leadActions}
          error={errors?.leadActions}
        />
      </div>

      <DataCard title="Lead actions by type" icon={BarChart3}>
        <BarList
          rows={byType}
          getIcon={(r) => getLeadActionIcon(r.kind)}
          initialVisible={5}
          format={formatNumber}
          loading={loading?.leadActions}
          error={errors?.leadActions}
        />
      </DataCard>

      <DataCard title="Per-page breakdown" icon={FileText}>
        {loading?.leadActions || errors?.leadActions ?
          <BarList rows={[]} loading={loading?.leadActions} error={errors?.leadActions} />
        : <LeadActionsPerPageTable
            rows={cur?.perPage ?? []}
            prevByPagePath={showCompare ? prevByPagePath : undefined}
          />
        }
      </DataCard>

      <DataCard
        title="Discovery paths"
        icon={Route}
        action={
          journeys && (
            <span className="flex items-center gap-2 text-[11px] text-[var(--theme-elevation-500)]">
              <span>
                Top {journeys.rows.length} chains · {formatNumber(journeys.sessionsConsidered)} sessions analysed
              </span>

              {journeys.truncated && (
                <span className="inline-flex items-center px-1.5 py-px rounded-full border border-[var(--theme-warning-200)] text-[var(--theme-warning-700)] bg-[var(--theme-warning-50)] text-[10px]">
                  Truncated
                </span>
              )}
            </span>
          )
        }>
        {journeys?.setupRequired ?
          <SetupRequiredCard missingKeys={journeys.missing ?? ["fr_session_id"]} />
        : <ChainList rows={journeys?.rows ?? []} loading={loading?.journeys} error={errors?.journeys} />}
      </DataCard>
    </div>
  );
}

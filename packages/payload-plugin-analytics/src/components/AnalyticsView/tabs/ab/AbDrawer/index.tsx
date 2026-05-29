"use client";

import { useEffect } from "react";
import {
  X,
  Split,
  Zap,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  AlertOctagon,
  Trophy,
  ArrowDown,
  Minus,
  Hourglass,
  CircleDot,
} from "lucide-react";
import { DataCard } from "../../../ui/DataCard";
import { useLeadActionRegistry } from "../../../contexts/LeadActionRegistryContext";
import { cn } from "../../../../../utils/style";
import { AbMultiLineChart } from "../AbMultiLineChart";
import { BucketName, abLiftClass } from "../cells";
import {
  getBucketColor,
  getBucketLabel,
  formatDayShort,
  formatPercent,
  formatPValue,
  formatSignedPercent,
} from "../format";
import {
  useAbExperimentHeaderQuery,
  useAbExperimentExposureQuery,
  useAbExperimentOutcomeQuery,
  useAbExperimentTimeSeriesQuery,
  useAbExperimentLeadBreakdownQuery,
} from "../../../hooks/queries/useAbQueries";
import type { AnalyticsQuery } from "../../../../../types/query";
import { Tooltip, TooltipTitle, TooltipText, TooltipLegend, TooltipLegendRow } from "../../../ui/Tooltip";
import { indBoxVariants, indPillVariants, verdictBadgeVariants, PANEL_TBL, type IndTone } from "./variants";

export interface AbDrawerProps {
  manifestKey: string;
  query: AnalyticsQuery;
  onClose: () => void;
}

export function AbDrawer({ manifestKey, query, onClose }: AbDrawerProps) {
  const header = useAbExperimentHeaderQuery(manifestKey, query);
  const exposure = useAbExperimentExposureQuery(manifestKey, query);
  const outcome = useAbExperimentOutcomeQuery(manifestKey, query);
  const timeSeries = useAbExperimentTimeSeriesQuery(manifestKey, query);
  const leadBreakdown = useAbExperimentLeadBreakdownQuery(manifestKey, query);
  const registry = useLeadActionRegistry();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const h = header.data;
  const exp = exposure.data;
  const out = outcome.data;
  const lb = leadBreakdown.data;
  const totalSessions = exp?.buckets.reduce((a, b) => a + b.sessions, 0) ?? 0;

  const mdeKnown = h?.mdeRelative != null;
  const mdePowered = mdeKnown && h!.mdeRelative! <= h!.mdeCeiling;
  const ceilPct = h ? (h.mdeCeiling * 100).toFixed(0) : "20";

  const srmTone: IndTone =
    exp ?
      exp.srmPassed ?
        "ok"
      : "fail"
    : "neutral";
  const mdeTone: IndTone =
    !mdeKnown ? "neutral"
    : mdePowered ? "ok"
    : "warn";

  return (
    <>
      <div className="fixed inset-0 bg-black/25 z-[80] pa-animate-fade-in" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed top-0 right-0 bottom-0 z-[90] w-[720px] max-w-full overflow-y-auto border-l border-(--theme-border-color) bg-(--theme-elevation-0) shadow-drawer pa-animate-drawer-in max-[760px]:w-screen">
        {/* header (scrolls with content) */}
        <div className="px-5 py-4 border-b border-(--theme-border-color) flex flex-col gap-2.5">
          <div className="flex items-center">
            <div className="flex flex-col gap-0.5">
              {h?.parentTitle && (
                <span className="text-[17px] font-semibold tracking-[-0.01em] text-(--theme-elevation-1000)">
                  {h.parentTitle}
                </span>
              )}
              <span className="font-[family-name:var(--font-mono)] text-[12.5px] text-(--theme-elevation-500)">
                {manifestKey}
              </span>
            </div>
            <button
              type="button"
              className="ml-auto w-8 h-8 grid place-items-center rounded-(--style-radius-s) border border-(--theme-border-color) hover:bg-(--theme-elevation-100)"
              onClick={onClose}
              aria-label="Close"
              title="Close (Esc)">
              <X size={14} />
            </button>
          </div>

          {/* top SRM / MDE indicator cards (each pass/fail with hover tooltip) */}
          <div className="mt-2.5 flex flex-wrap gap-2.5">
            <Tooltip
              className={cn(indBoxVariants({ tone: srmTone }))}
              content={
                <>
                  <TooltipTitle>Sample Ratio Mismatch</TooltipTitle>
                  <TooltipText>
                    Chi-square test that the observed traffic split matches the configured split. A mismatch points to a
                    bucketing or tracking bug that invalidates results.
                  </TooltipText>
                  <TooltipLegend>
                    <TooltipLegendRow color="var(--theme-success-500)">Healthy — p ≥ 0.001</TooltipLegendRow>
                    <TooltipLegendRow color="var(--theme-error-500)">Mismatch — p &lt; 0.001</TooltipLegendRow>
                  </TooltipLegend>
                </>
              }>
              {!exp ?
                <Minus size={18} />
              : exp.srmPassed ?
                <CheckCircle2 size={18} />
              : <AlertOctagon size={18} />}
              <span className="flex min-w-0 flex-col gap-[3px]">
                <span className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-(--theme-elevation-500)">
                    Sample ratio
                  </span>
                  <span className={cn(indPillVariants({ tone: srmTone }))}>
                    {!exp ?
                      "—"
                    : exp.srmPassed ?
                      "Healthy"
                    : "Mismatch"}
                  </span>
                </span>
                <span className="font-[family-name:var(--font-mono)] text-[14px] font-semibold tracking-[-0.01em] tabular-nums text-(--theme-elevation-1000)">
                  {exp ? `χ² p ${exp.srmPValue < 0.001 ? "< 0.001" : "= " + exp.srmPValue.toFixed(3)}` : "—"}
                </span>
              </span>
            </Tooltip>

            <Tooltip
              className={cn(indBoxVariants({ tone: mdeTone }))}
              content={
                <>
                  <TooltipTitle>Minimum Detectable Effect</TooltipTitle>
                  <TooltipText>
                    Smallest relative lift this test can detect at the current sample size (α 0.05, power 0.80). Collect
                    more sessions before trusting a "no effect" reading while underpowered.
                  </TooltipText>
                  <TooltipLegend>
                    <TooltipLegendRow color="var(--theme-success-500)">
                      Detectable — MDE ≤ {ceilPct}% (the qualification ceiling)
                    </TooltipLegendRow>
                    <TooltipLegendRow color="var(--theme-warning-500)">
                      Underpowered — MDE &gt; {ceilPct}%
                    </TooltipLegendRow>
                  </TooltipLegend>
                </>
              }>
              {!mdeKnown ?
                <Minus size={18} />
              : mdePowered ?
                <CheckCircle2 size={18} />
              : <Hourglass size={18} />}
              <span className="flex min-w-0 flex-col gap-[3px]">
                <span className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-(--theme-elevation-500)">
                    Sensitivity
                  </span>
                  <span className={cn(indPillVariants({ tone: mdeTone }))}>
                    {!mdeKnown ?
                      "No data"
                    : mdePowered ?
                      "Detectable"
                    : "Underpowered"}
                  </span>
                </span>
                <span className="font-[family-name:var(--font-mono)] text-[14px] font-semibold tracking-[-0.01em] tabular-nums text-(--theme-elevation-1000)">
                  {mdeKnown ? `MDE ${(h!.mdeRelative! * 100).toFixed(1)}%` : "—"}
                </span>
              </span>
            </Tooltip>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-0 overflow-hidden rounded-(--style-radius-m) border border-(--theme-border-color) max-[760px]:grid-cols-2">
            <div className="flex flex-col gap-[3px] border-r border-(--theme-border-color) px-3 py-2.5 last:border-r-0 max-[760px]:[&:nth-child(2)]:border-r-0">
              <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-(--theme-elevation-500)">
                Variants
              </span>
              <span className="text-[12.5px] font-medium text-(--theme-elevation-900)">
                {h ? `${h.variantCount} variant${h.variantCount === 1 ? "" : "s"}` : "—"}
              </span>
            </div>
            <div className="flex flex-col gap-[3px] border-r border-(--theme-border-color) px-3 py-2.5 last:border-r-0 max-[760px]:[&:nth-child(2)]:border-r-0">
              <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-(--theme-elevation-500)">
                Started
              </span>
              <span className="text-[12.5px] font-medium text-(--theme-elevation-900)">
                {h?.startedAt ? formatDayShort(h.startedAt) : "—"}
              </span>
            </div>
            <div className="flex flex-col gap-[3px] border-r border-(--theme-border-color) px-3 py-2.5 last:border-r-0 max-[760px]:[&:nth-child(2)]:border-r-0">
              <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-(--theme-elevation-500)">
                Days running
              </span>
              <span className="text-[12.5px] font-medium text-(--theme-elevation-900)">
                {h?.daysRunning != null ? `${h.daysRunning} days` : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-3.5 bg-(--theme-elevation-50)">
          {/* Panel 1 — Exposure & traffic split */}
          <DataCard
            title="Exposure & traffic split"
            icon={Split}
            action={
              exp ?
                <span
                  className={cn(
                    "inline-flex items-center gap-[5px] rounded-full border px-[9px] py-[3px] text-[11px] font-medium",
                    exp.srmPassed ?
                      "border-(--theme-success-100) bg-(--theme-success-50) text-(--theme-success-700) dark:text-(--theme-success-500)"
                    : "border-(--theme-error-500) bg-(--theme-error-50) text-(--theme-error-500)",
                  )}>
                  {exp.srmPassed ?
                    <CheckCircle2 size={12} />
                  : <AlertOctagon size={12} />}
                  SRM {exp.srmPassed ? "pass" : "fail"} · p {formatPValue(exp.srmPValue)}
                </span>
              : undefined
            }>
            <table className={PANEL_TBL}>
              <thead>
                <tr>
                  <th>Bucket</th>
                  <th className="num">Visitors</th>
                  <th className="num">Sessions</th>
                  <th className="num">Observed</th>
                  <th className="num">Configured</th>
                </tr>
              </thead>
              <tbody>
                {(exp?.buckets ?? []).map((b, i) => {
                  const obs = totalSessions > 0 ? b.sessions / totalSessions : 0;
                  return (
                    <tr key={b.bucket}>
                      <td>
                        <BucketName bucket={b.bucket} name={b.name} index={i} />
                      </td>
                      <td className="num">{b.visitors.toLocaleString()}</td>
                      <td className="num">{b.sessions.toLocaleString()}</td>
                      <td className="num">{(obs * 100).toFixed(1)}%</td>
                      <td className="num text-(--theme-elevation-500)">
                        {b.configuredShare != null ? `${(b.configuredShare * 100).toFixed(0)}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DataCard>

          {/* Panel 2 — Primary outcome */}
          {(() => {
            const winnerRow = out?.winnerBucket ? out.rows.find((r) => r.bucket === out.winnerBucket) : undefined;
            const leaderRow =
              !out?.winnerBucket && out?.leaderBucket ? out.rows.find((r) => r.bucket === out.leaderBucket) : undefined;
            return (
              <DataCard
                title="Lead conversion"
                icon={Zap}
                action={
                  winnerRow ?
                    <span className="inline-flex items-center gap-[5px] whitespace-nowrap rounded-full border border-(--theme-success-200) bg-(--theme-success-50) px-2.5 py-[3px] text-[11px] font-semibold text-(--theme-success-700) dark:text-(--theme-success-500)">
                      <Trophy size={12} /> Winner · {getBucketLabel(winnerRow.bucket, winnerRow.name)}
                    </span>
                  : leaderRow ?
                    <span className="inline-flex items-center gap-[5px] whitespace-nowrap rounded-full border border-(--theme-border-color) bg-(--theme-elevation-50) px-2.5 py-[3px] text-[11px] font-semibold text-[var(--theme-elevation-600,var(--theme-elevation-500))]">
                      <CircleDot size={11} /> Leader · {getBucketLabel(leaderRow.bucket, leaderRow.name)} (provisional)
                    </span>
                  : undefined
                }>
                <table className={PANEL_TBL}>
                  <thead>
                    <tr>
                      <th>Bucket</th>
                      <th className="num">Session conversions</th>
                      <th className="num">Rate</th>
                      <th className="num">Lift</th>
                      <th className="num">Confidence</th>
                      <th>Significance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(out?.rows ?? []).map((r, i) => {
                      const isWinner = out?.winnerBucket === r.bucket;
                      const isLeader = !out?.winnerBucket && out?.leaderBucket === r.bucket;

                      return (
                        <tr
                          key={r.bucket}
                          className={cn(
                            isWinner && "bg-(--theme-success-50)",
                            isLeader && "bg-(--theme-elevation-50)",
                          )}>
                          <td>
                            <BucketName bucket={r.bucket} name={r.name} index={i} />
                          </td>
                          <td className="num">
                            <div className="flex flex-col items-end gap-px">
                              <span>{r.convertingSessions.toLocaleString()}</span>
                              <span className="text-[10.5px] font-[family-name:var(--font-mono)] text-(--theme-elevation-500)">
                                {r.rawConversions} events
                              </span>
                            </div>
                          </td>
                          <td className="num">
                            <b>{formatPercent(r.conversionRate)}</b>
                          </td>
                          <td className="num">
                            {r.relativeLift != null ?
                              <div className="flex flex-col items-end gap-px">
                                <span
                                  className={abLiftClass(
                                    r.verdict === "winner" ? "is-up"
                                    : r.verdict === "loser" ? "is-down"
                                    : "is-ns",
                                  )}>
                                  {formatSignedPercent(r.relativeLift)}
                                </span>
                                <span className="text-[10.5px] font-mono text-(--theme-elevation-500)">
                                  {r.absoluteLift != null ? formatSignedPercent(r.absoluteLift, 2) : ""}
                                </span>
                              </div>
                            : <span className="text-(--theme-elevation-500)">—</span>}
                          </td>
                          <td className="num">
                            {r.confidence != null ?
                              <span
                                className="cursor-help font-semibold tabular-nums text-(--theme-elevation-900)"
                                title="Φ(z) — one-sided normal reading of the z-score. Not a Bayesian win probability.">
                                {(r.confidence * 100).toFixed(1)}%
                              </span>
                            : <span className="text-(--theme-elevation-500)">—</span>}
                          </td>
                          <td>
                            {r.verdict ?
                              <span className={cn(verdictBadgeVariants({ verdict: r.verdict }))}>
                                {r.verdict === "winner" && <Trophy size={11} />}
                                {r.verdict === "loser" && <ArrowDown size={11} />}
                                {r.verdict === "ns" && <Minus size={11} />}
                                {r.verdict === "winner" ?
                                  "Significant winner"
                                : r.verdict === "loser" ?
                                  "Significant loser"
                                : "Not significant"}
                                {r.pValue != null && (
                                  <span className="pl-0.5 font-[family-name:var(--font-mono)] text-[10px] opacity-85">
                                    p {formatPValue(r.pValue)}
                                  </span>
                                )}
                              </span>
                            : <span className="text-(--theme-elevation-500)">baseline</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {out && (
                  <div className="mt-2.5 flex items-start gap-[7px] border-t border-(--theme-border-color) pt-[11px] text-[11.5px] leading-[1.5] text-[var(--theme-elevation-600,var(--theme-elevation-500))] [&>svg]:mt-0.5 [&>svg]:shrink-0 [&>svg]:text-(--theme-elevation-500) [&_b]:font-semibold [&_b]:text-(--theme-elevation-1000)">
                    {winnerRow ?
                      <>
                        <Trophy size={12} /> <b>{getBucketLabel(winnerRow.bucket, winnerRow.name)}</b> is the crowned
                        winner — highest confidence (
                        {winnerRow.confidence != null ? `${(winnerRow.confidence * 100).toFixed(1)}%` : "—"}) among
                        variants clearing p &lt; {out.alpha} with positive lift and ≥ {out.sessionFloor} sessions per
                        bucket.
                      </>
                    : leaderRow ?
                      <>
                        <CircleDot size={11} /> No variant has reached significance.{" "}
                        <b>{getBucketLabel(leaderRow.bucket, leaderRow.name)}</b> leads provisionally at{" "}
                        {leaderRow.confidence != null ? `${(leaderRow.confidence * 100).toFixed(1)}%` : "—"} confidence
                        — keep collecting before acting.
                      </>
                    : <>
                        <Minus size={12} /> No variant to compare.
                      </>
                    }
                  </div>
                )}
              </DataCard>
            );
          })()}

          {/* Panel 3 — Time series */}
          <DataCard
            title="Cumulative conversion rate"
            icon={TrendingUp}
            action={
              <div className="flex flex-wrap gap-3">
                {(timeSeries.data?.series ?? []).map((s, i) => (
                  <span
                    key={s.bucket}
                    className="inline-flex items-center gap-[5px] text-[11px] text-[var(--theme-elevation-600,var(--theme-elevation-500))]">
                    <span className="h-[3px] w-3.5 rounded-[2px]" style={{ background: getBucketColor(i) }} />
                    {getBucketLabel(s.bucket, s.name)}
                  </span>
                ))}
              </div>
            }>
            {timeSeries.data ?
              <AbMultiLineChart data={timeSeries.data} />
            : <div className="relative h-[240px]" />}
          </DataCard>

          {/* Panel 4 — Lead-action breakdown */}
          {lb && lb.rows.length > 0 && (
            <DataCard title="Lead-action breakdown" icon={BarChart3}>
              <table className={PANEL_TBL}>
                <thead>
                  <tr>
                    <th>Lead type</th>
                    {lb.buckets.map((b, i) => (
                      <th key={b.bucket} className="num">
                        <span className="inline-flex items-center justify-end gap-[5px]">
                          <span
                            className="h-[9px] w-[9px] shrink-0 rounded-[3px]"
                            style={{ background: getBucketColor(i) }}
                          />
                          {getBucketLabel(b.bucket, b.name)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lb.rows.map((row) => {
                    const Icon = registry.resolveIcon(row.leadType);
                    return (
                      <tr key={row.leadType}>
                        <td>
                          <span className="inline-flex items-center gap-[7px] [&>svg]:text-(--theme-elevation-500)">
                            <Icon size={12} />
                            {registry.resolveLabel(row.leadType)}
                          </span>
                        </td>
                        {lb.buckets.map((b) => {
                          const count = row.byBucket[b.bucket] ?? 0;
                          const conversionRate = b.sessions > 0 ? count / b.sessions : 0;
                          return (
                            <td key={b.bucket} className="num">
                              {(conversionRate * 100).toFixed(1)}%
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </DataCard>
          )}
        </div>
      </div>
    </>
  );
}

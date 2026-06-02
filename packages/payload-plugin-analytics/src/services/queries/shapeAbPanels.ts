import type { ResolvedAbConfig } from "../../config/resolveAbConfig";
import type { AbExposureResponse, AbOutcomeResponse, AbExperimentHeaderResponse, AbLeadBreakdownResponse } from "../../types/ab";
import type { AbExperimentStats } from "./getAbExperimentStats";
import { AB_CONTROL_BUCKET } from "../../constants/ab";
import { sampleRatioMismatchCheck } from "../abStatistics/sampleRatioMismatchCheck";
import { twoProportionZTest } from "../abStatistics/twoProportionZTest";
import { verdict } from "../abStatistics/verdict";
import { minimumDetectableEffect } from "../abStatistics/minimumDetectableEffect";
import { confidence } from "../abStatistics/confidence";
import { pickWinner } from "../abStatistics/pickWinner";
import type { WinnerCandidate } from "../abStatistics/types";

function controlOf(stats: AbExperimentStats) {
  return stats.buckets.find((b) => b.bucket === AB_CONTROL_BUCKET) ?? stats.buckets[0]!;
}

export function shapeExposure(stats: AbExperimentStats, ab: ResolvedAbConfig): AbExposureResponse {
  const observed = stats.buckets.map((b) => b.sessions);
  const shares = stats.buckets.map((b) => b.configuredShare ?? 0);
  const total = shares.reduce((a, b) => a + b, 0);
  const normShares = total > 0 ? shares.map((s) => s / total) : stats.buckets.map(() => 1 / stats.buckets.length);
  const srm = sampleRatioMismatchCheck(observed, normShares, ab.stats.srmThreshold);

  return {
    buckets: stats.buckets,
    srmPassed: srm.passed,
    srmPValue: srm.pValue,
  };
}

export function shapeOutcome(stats: AbExperimentStats, ab: ResolvedAbConfig): AbOutcomeResponse {
  const control = controlOf(stats);
  const candidates: WinnerCandidate[] = [];
  const rows = stats.buckets.map((b) => {
    const conversionRate = b.sessions > 0 ? b.convertingSessions / b.sessions : 0;

    if (b.bucket === control.bucket) {
      return {
        ...b,
        conversionRate,
        absoluteLift: null,
        relativeLift: null,
        pValue: null,
        confidence: null,
        verdict: null,
      };
    }

    const t = twoProportionZTest(b.convertingSessions, b.sessions, control.convertingSessions, control.sessions);

    candidates.push({
      bucket: b.bucket,
      zScore: t.zScore,
      relativeLift: t.relativeLift,
      minBucketSessions: Math.min(b.sessions, control.sessions),
    });

    return {
      ...b,
      conversionRate,
      absoluteLift: t.absoluteLift,
      relativeLift: t.relativeLift,
      pValue: t.pValue,
      confidence: confidence(t.zScore),
      verdict: verdict(t, ab.stats.alpha) as "winner" | "loser" | "ns",
    };
  });
  const { winnerBucket, leaderBucket } = pickWinner(candidates, {
    alpha: ab.stats.alpha,
    sessionFloor: ab.winRate.sessionFloor,
  });
  // alpha + sessionFloor echo the thresholds used so the drawer's explanatory
  // note (ab-panel-note) can state the exact rule without re-reading config.
  return { rows, winnerBucket, leaderBucket, alpha: ab.stats.alpha, sessionFloor: ab.winRate.sessionFloor };
}

export function shapeHeader(stats: AbExperimentStats, ab: ResolvedAbConfig, manifestKey: string, parentTitle: string | null): AbExperimentHeaderResponse {
  const control = controlOf(stats);
  const controlRate = control.sessions > 0 ? control.convertingSessions / control.sessions : 0;
  const minBucketSessions = Math.min(...stats.buckets.map((b) => b.sessions));
  const m = minimumDetectableEffect(controlRate, minBucketSessions, ab.stats.alpha, ab.stats.power);
  const daysRunning = stats.startedAt ? Math.max(1, Math.round((Date.now() - new Date(stats.startedAt).getTime()) / 86_400_000)) : null;

  return {
    manifestKey,
    parentTitle,
    startedAt: stats.startedAt,
    daysRunning,
    variantCount: stats.buckets.filter((b) => b.bucket !== AB_CONTROL_BUCKET).length,
    mdeRelative: m?.relative ?? null,
    mdeCeiling: ab.winRate.mdeCeiling,
  };
}

export function shapeLeadBreakdown(stats: AbExperimentStats): AbLeadBreakdownResponse {
  const buckets = stats.buckets.map((b) => ({ bucket: b.bucket, name: b.name, sessions: b.sessions }));
  const leadTypes = new Set<string>();

  for (const perLead of Object.values(stats.byBucketLead)) {
    for (const lt of Object.keys(perLead)) leadTypes.add(lt);
  }

  const rows = [...leadTypes]
    .filter((lt) => stats.buckets.some((b) => (stats.byBucketLead[b.bucket]?.[lt] ?? 0) > 0))
    .map((leadType) => {
      const byBucket: Record<string, number> = {};

      for (const b of stats.buckets) byBucket[b.bucket] = stats.byBucketLead[b.bucket]?.[leadType] ?? 0;

      return { leadType, byBucket };
    });

  return { buckets, rows };
}

import type { AbKpisResponse, AbExperimentListRow, AbExperimentQuery } from "../../types/ab";
import { getPluginConfig } from "../../config";
import { resolveAbConfig } from "../../config/resolveAbConfig";
import { resolveDateRange } from "../../utils/date/resolveDateRange";
import { dateRangesFor, type AbFilterExpression } from "../../utils/ga4";
import { runQuery } from "../analyticsService/runQuery";
import { AB_CONTROL_BUCKET } from "../../constants/ab";
import { convertingFilter } from "../../utils/ga4/ab";
import { sampleRatioMismatchCheck } from "../abStatistics/sampleRatioMismatchCheck";
import { twoProportionZTest } from "../abStatistics/twoProportionZTest";
import { isQualified } from "../abStatistics/isQualified";
import { pickWinner } from "../abStatistics/pickWinner";
import { portfolioWinRate } from "../abStatistics/portfolioWinRate";
import type { PortfolioExperiment, WinnerCandidate } from "../abStatistics/types";
import { getAbExperimentRecords } from "./getAbExperimentRecords";
import { getExperimentBucketMeta } from "./getExperimentBucketMeta";
import type { PayloadRequest } from "payload";

interface Row {
  dimensionValues?: Array<{ value?: string | null }>;
  metricValues?: Array<{ value?: string | null }>;
}

const d = (row: Row, i: number) => row.dimensionValues?.[i]?.value ?? "";
const m = (row: Row, i: number) => parseInt(row.metricValues?.[i]?.value ?? "0", 10) || 0;

export interface AbOverviewResult {
  kpis: AbKpisResponse;
  rows: AbExperimentListRow[];
}

function median(xs: number[]): number {
  if (!xs.length) return 0;

  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);

  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export async function getAbOverview(
  query: { dateRange: AbExperimentQuery["dateRange"] },
  req: PayloadRequest,
): Promise<AbOverviewResult> {
  const pluginConfig = getPluginConfig();
  const ab = resolveAbConfig(pluginConfig.ab);
  if (!ab) throw new Error("A/B integration not configured");

  const records = await getAbExperimentRecords(ab.experimentsCollectionSlug, req);
  const keys = records.map((r) => r.manifestKey);
  const empty: AbOverviewResult = {
    kpis: {
      activeExperiments: 0,
      variantsLive: 0,
      exposedSessions: 0,
      leadConversions: 0,
      avgAgeDays: 0,
      needingAttention: 0,
      winRate: { rate: null, winners: 0, qualified: 0, notQualified: 0 },
    },
    rows: [],
  };
  if (keys.length === 0) return empty;

  const dateRanges = dateRangesFor(resolveDateRange(query.dateRange));
  const D = ab.dimensions;
  const inExperiments: AbFilterExpression = {
    filter: { fieldName: `customEvent:${D.experiment}`, inListFilter: { values: keys } },
  };

  const exposureReq = {
    dateRanges,
    metrics: [{ name: "eventCount" }],
    dimensions: [
      { name: `customEvent:${D.experiment}` },
      { name: `customEvent:${D.variant}` },
      { name: "customEvent:fr_session_id" },
      { name: `customEvent:${D.visitorId}` },
    ],
    dimensionFilter: inExperiments,
    limit: 250_000,
  };

  const convByBucketReq = {
    dateRanges,
    metrics: [{ name: "eventCount" }],
    dimensions: [
      { name: `customEvent:${D.experiment}` },
      { name: `customEvent:${D.variant}` },
      { name: "customEvent:fr_session_id" },
    ],
    dimensionFilter: {
      andGroup: { expressions: [inExperiments, convertingFilter(D.experiment, "").andGroup!.expressions![1]!] },
    },
    limit: 250_000,
  };

  const convByPageReq = {
    dateRanges,
    metrics: [{ name: "eventCount" }],
    dimensions: [{ name: `customEvent:${D.experiment}` }, { name: "pagePath" }],
    dimensionFilter: {
      andGroup: { expressions: [inExperiments, convertingFilter(D.experiment, "").andGroup!.expressions![1]!] },
    },
    limit: 100_000,
  };

  const batch = await runQuery.batchRunReports(
    pluginConfig.ga4.propertyId,
    [exposureReq, convByBucketReq, convByPageReq] as never,
    "abOverview",
  );
  const [expReport, convBucketReport, convPageReport] = batch.reports ?? [];

  // group exposure: experiment -> bucket -> {sessions:Set, visitors:Set}
  const exp = new Map<string, Map<string, { s: Set<string>; v: Set<string> }>>();
  for (const row of (expReport?.rows ?? []) as Row[]) {
    const e = d(row, 0),
      b = d(row, 1),
      sid = d(row, 2),
      vid = d(row, 3);
    if (!e || !b) continue;
    const byB = exp.get(e) ?? exp.set(e, new Map()).get(e)!;
    const cell = byB.get(b) ?? byB.set(b, { s: new Set(), v: new Set() }).get(b)!;
    if (sid) cell.s.add(sid);
    if (vid) cell.v.add(vid);
  }

  // group converting by bucket: experiment -> bucket -> Set sessions
  const conv = new Map<string, Map<string, Set<string>>>();
  for (const row of (convBucketReport?.rows ?? []) as Row[]) {
    const e = d(row, 0),
      b = d(row, 1),
      sid = d(row, 2);
    if (!e || !b || !sid) continue;
    const byB = conv.get(e) ?? conv.set(e, new Map()).get(e)!;
    (byB.get(b) ?? byB.set(b, new Set()).get(b)!).add(sid);
  }

  // lead conversions by page: keep only pagePath == experiment
  let leadConversions = 0;
  for (const row of (convPageReport?.rows ?? []) as Row[]) {
    if (d(row, 0) === d(row, 1)) leadConversions += m(row, 0);
  }

  let exposedSessions = 0;
  let variantsLive = 0;
  let needingAttention = 0;
  const rows: AbExperimentListRow[] = [];
  const portfolioExps: PortfolioExperiment[] = [];

  for (const rec of records) {
    const byB = exp.get(rec.manifestKey) ?? new Map();
    const convB = conv.get(rec.manifestKey) ?? new Map();
    const meta = await getExperimentBucketMeta(rec.parentCollection, rec.parentDocId, rec.locale ?? undefined, ab, req);

    const bucketNames = new Set<string>([...byB.keys(), ...convB.keys(), ...Object.keys(meta)]);
    const orderedBuckets = [...bucketNames].sort((a, b) =>
      a === AB_CONTROL_BUCKET ? -1
      : b === AB_CONTROL_BUCKET ? 1
      : a.localeCompare(b),
    );

    const sessionSet = new Set<string>();
    const visitorSet = new Set<string>();
    for (const cell of byB.values()) {
      for (const s of cell.s) sessionSet.add(s);
      for (const v of cell.v) visitorSet.add(v);
    }

    exposedSessions += sessionSet.size;
    const variantCount = orderedBuckets.filter((b) => b !== AB_CONTROL_BUCKET).length;
    variantsLive += variantCount;

    const control = AB_CONTROL_BUCKET;
    const controlSessions = byB.get(control)?.s.size ?? 0;
    const controlConversions = convB.get(control)?.size ?? 0;

    const observed = orderedBuckets.map((b) => byB.get(b)?.s.size ?? 0);
    const shares = orderedBuckets.map((b) => meta[b]?.configuredShare ?? 0);
    const shareTotal = shares.reduce((a, b) => a + b, 0);
    const normShares =
      shareTotal > 0 ? shares.map((s) => s / shareTotal) : orderedBuckets.map(() => 1 / orderedBuckets.length);
    const srm = sampleRatioMismatchCheck(observed, normShares, ab.stats.srmThreshold);
    if (!srm.passed) needingAttention += 1;

    let bestRelativeLift: number | null = null;
    let bestSignificant = false;
    let bestPValue: number | null = null;
    let conversions = 0;
    const candidates: WinnerCandidate[] = [];

    for (const b of orderedBuckets) {
      conversions += convB.get(b)?.size ?? 0;

      if (b === control) continue;

      const variantSessions = byB.get(b)?.s.size ?? 0;
      const t = twoProportionZTest(convB.get(b)?.size ?? 0, variantSessions, controlConversions, controlSessions);

      candidates.push({
        bucket: b,
        zScore: t.zScore,
        relativeLift: t.relativeLift,
        minBucketSessions: Math.min(variantSessions, controlSessions),
      });

      if (bestRelativeLift == null || t.relativeLift > bestRelativeLift) {
        bestRelativeLift = t.relativeLift;
        bestSignificant = t.pValue < ab.stats.alpha;
        bestPValue = t.pValue;
      }
    }

    const { winnerBucket } = pickWinner(candidates, { alpha: ab.stats.alpha, sessionFloor: ab.winRate.sessionFloor });
    const controlRate = controlSessions > 0 ? controlConversions / controlSessions : 0;
    const minBucketSessions = observed.length ? Math.min(...observed) : 0;
    const qualified = isQualified(
      { controlRate, minBucketSessions, srmPassed: srm.passed },
      {
        mdeCeiling: ab.winRate.mdeCeiling,
        sessionFloor: ab.winRate.sessionFloor,
        alpha: ab.stats.alpha,
        power: ab.stats.power,
      },
    );
    portfolioExps.push({ qualified, hasWinner: winnerBucket != null });

    const outcome: AbExperimentListRow["outcome"] =
      !srm.passed ? "srm"
      : winnerBucket != null ? "winner"
      : qualified ? "no_effect"
      : "collecting";

    rows.push({
      manifestKey: rec.manifestKey,
      parentTitle: null,
      startedAt: rec.startedAt,
      variantCount,
      visitors: visitorSet.size,
      conversions,
      bestRelativeLift,
      bestSignificant,
      bestPValue,
      srmPassed: srm.passed,
      srmPValue: srm.pValue,
      outcome,
      lastUpdated: null,
    });
  }

  rows.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const ages = records.map((r) => Math.max(1, Math.round((Date.now() - new Date(r.startedAt).getTime()) / 86_400_000)));

  return {
    kpis: {
      activeExperiments: records.length,
      variantsLive,
      exposedSessions,
      leadConversions,
      avgAgeDays: Math.round(median(ages)),
      needingAttention,
      winRate: portfolioWinRate(portfolioExps),
    },
    rows,
  };
}

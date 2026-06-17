import type { AnalyticsQuery, KpiCurrent, KpiResponse, KpiSeriesPoint, Row } from "../../types/query";
import type { PageFilterContext } from "../pageFilter/types";
import { resolveDateRange } from "../../utils/date/resolveDateRange";
import { resolveComparison } from "../../utils/date/resolveComparison";
import { dateRangesFor, bucketByDateRange, convertMetricToNumber, computeWeightedValuesAverage, dim, isoFromGa4Date } from "../../utils/ga4";
import { runQuery } from "../analyticsService/runQuery";
import { aggregateSessions } from './kpiRecompute/aggregateSessions';
import type { KpiSessionEventRow } from './kpiRecompute/aggregateSessions';

const METRICS = [{ name: "sessions" }, { name: "totalUsers" }, { name: "screenPageViews" }, { name: "bounceRate" }, { name: "averageSessionDuration" }];

function aggregate(rows: Row[]): KpiCurrent {
  let pageViews = 0,
    sessions = 0,
    users = 0;

  const bounceRateSamples: { value: number; weight: number }[] = [];
  const averageSessionDurationSamples: { value: number; weight: number }[] = [];

  for (const row of rows) {
    const metricValues = row.metricValues ?? [];

    const sessionValue = convertMetricToNumber(metricValues[0]?.value);
    const usersValue = convertMetricToNumber(metricValues[1]?.value);
    const pageViewsValue = convertMetricToNumber(metricValues[2]?.value);
    const bounceRateValue = convertMetricToNumber(metricValues[3]?.value);
    const averageSessionDurationValue = convertMetricToNumber(metricValues[4]?.value);

    sessions += sessionValue;
    users += usersValue;
    pageViews += pageViewsValue;
    bounceRateSamples.push({ value: bounceRateValue, weight: sessionValue });
    averageSessionDurationSamples.push({ value: averageSessionDurationValue, weight: sessionValue });
  }

  return {
    sessions,
    users,
    pageViews,
    bounceRate: computeWeightedValuesAverage(bounceRateSamples),
    avgSessionDuration: computeWeightedValuesAverage(averageSessionDurationSamples),
  };
}

function buildSeries(rows: Row[]): KpiSeriesPoint[] {
  const points: KpiSeriesPoint[] = rows
    .map((r) => ({
      date: isoFromGa4Date(r.dimensionValues?.[0]?.value),
      sessions: convertMetricToNumber(r.metricValues?.[0]?.value),
      users: convertMetricToNumber(r.metricValues?.[1]?.value),
      pageViews: convertMetricToNumber(r.metricValues?.[2]?.value),
      bounceRate: convertMetricToNumber(r.metricValues?.[3]?.value),
      avgSessionDuration: convertMetricToNumber(r.metricValues?.[4]?.value),
    }))
    .filter((p) => p.date !== "");

  points.sort((a, b) => a.date.localeCompare(b.date));

  return points;
}

async function getKpisNative(propertyId: string, query: AnalyticsQuery): Promise<KpiResponse> {
  const dateRange = resolveDateRange(query.dateRange);
  const previousDateRange = query.comparison?.kind === "previous-period" ? resolveComparison(dateRange) : undefined;
  const dateRanges = dateRangesFor(dateRange, previousDateRange);

  const dimensions = [{ name: "date" }];

  const raw = await runQuery.runReport(propertyId, { dateRanges, metrics: METRICS, dimensions }, "kpis");
  const rows = (raw.rows ?? []) as Row[];

  if (!previousDateRange) {
    return {
      current: aggregate(rows),
      series: buildSeries(rows),
    };
  }

  const buckets = bucketByDateRange(rows, ["current", "previous"]);

  return {
    current: aggregate(buckets.current),
    comparison: aggregate(buckets.previous),
    series: buildSeries(buckets.current),
    comparisonSeries: buildSeries(buckets.previous),
  };
}

function decodeSessionRows(rows: Row[], pageRefIndex: number, eventNameIndex: number, dhmIndex: number): KpiSessionEventRow[] {
  return rows.map((row) => ({
    sessionId: dim(row, 0),
    date: dim(row, 1),
    pageRef: dim(row, pageRefIndex),
    eventName: dim(row, eventNameIndex),
    dhm: dim(row, dhmIndex),
  }));
}

async function getKpisRecomputed(propertyId: string, query: AnalyticsQuery, pageFilter: PageFilterContext): Promise<KpiResponse> {
  const dateRange = resolveDateRange(query.dateRange);
  const previousDateRange = query.comparison?.kind === "previous-period" ? resolveComparison(dateRange) : undefined;
  const dateRanges = dateRangesFor(dateRange, previousDateRange);
  const existing = new Set(pageFilter.refs);

  const dimensions: Array<{ name: string }> = [{ name: "customEvent:fr_session_id" }, { name: "date" }];
  const pageRefIndex = dimensions.length;
  dimensions.push({ name: pageFilter.pageRefDim });
  const eventNameIndex = dimensions.length;
  dimensions.push({ name: "eventName" });
  const dhmIndex = dimensions.length;
  dimensions.push({ name: "dateHourMinute" });

  const raw = await runQuery.runReport(propertyId, { dateRanges, metrics: [{ name: "eventCount" }], dimensions }, "kpis");
  const rows = (raw.rows ?? []) as Row[];

  if (!previousDateRange) {
    const { current, series } = aggregateSessions(decodeSessionRows(rows, pageRefIndex, eventNameIndex, dhmIndex), existing);

    return { current, series };
  }

  const buckets = bucketByDateRange(rows, ["current", "previous"]);
  const currentAgg = aggregateSessions(decodeSessionRows(buckets.current, pageRefIndex, eventNameIndex, dhmIndex), existing);
  const previousAgg = aggregateSessions(decodeSessionRows(buckets.previous, pageRefIndex, eventNameIndex, dhmIndex), existing);

  return {
    current: currentAgg.current,
    comparison: previousAgg.current,
    series: currentAgg.series,
    comparisonSeries: previousAgg.series,
  };
}

export async function getKpis(propertyId: string, query: AnalyticsQuery, pageFilter?: PageFilterContext | null): Promise<KpiResponse> {
  if (!pageFilter || pageFilter.refs.length === 0) {
    return getKpisNative(propertyId, query);
  }

  return getKpisRecomputed(propertyId, query, pageFilter);
}

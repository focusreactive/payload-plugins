import type { AnalyticsQuery, KpiCurrent, KpiResponse, KpiSeriesPoint, Row } from "../../types/query";
import { resolveDateRange } from "../../utils/date/resolveDateRange";
import { resolveComparison } from "../../utils/date/resolveComparison";
import { dateRangesFor, bucketByDateRange, convertMetricToNumber, computeWeightedValuesAverage } from "../../utils/ga4";
import { runQuery } from "../analyticsService/runQuery";

const METRICS = [{ name: "sessions" }, { name: "totalUsers" }, { name: "screenPageViews" }, { name: "bounceRate" }, { name: "averageSessionDuration" }];

function isoFromGa4Date(yyyymmdd: string | null | undefined) {
  if (!yyyymmdd || yyyymmdd.length !== 8) return "";

  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

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

export async function getKpis(propertyId: string, query: AnalyticsQuery): Promise<KpiResponse> {
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

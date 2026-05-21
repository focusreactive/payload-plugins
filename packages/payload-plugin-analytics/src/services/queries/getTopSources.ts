import type { Row, TopNQuery, TopSourcesResponse, TopSourcesRow } from "../../types/query";
import { resolveDateRange } from "../../utils/date/resolveDateRange";
import { resolveComparison } from "../../utils/date/resolveComparison";
import { bucketByDateRange, convertMetricToNumber, dateRangesFor, withRowLimit } from "../../utils/ga4";
import { runQuery } from "../analyticsService/runQuery";

const METRICS = [{ name: "sessions" }, { name: "totalUsers" }];

function convertRowToTopSourcesRow(row: Row): TopSourcesRow {
  const dimensionValues = row.dimensionValues ?? [];
  const metricValues = row.metricValues ?? [];

  return {
    source: dimensionValues[0]?.value ?? "",
    medium: dimensionValues[1]?.value ?? "",
    channel: dimensionValues[2]?.value ?? "",
    sessions: convertMetricToNumber(metricValues[0]?.value),
    users: convertMetricToNumber(metricValues[1]?.value),
  };
}

function buildSourceKey(row: TopSourcesRow): string {
  return `${row.source}|${row.medium}|${row.channel}`;
}

export async function getTopSources(propertyId: string, query: TopNQuery): Promise<TopSourcesResponse> {
  const dateRange = resolveDateRange(query.dateRange);
  const previousDateRange = query.comparison?.kind === "previous-period" ? resolveComparison(dateRange) : undefined;
  const dateRanges = dateRangesFor(dateRange, previousDateRange);

  const dimensions = [{ name: "sessionSource" }, { name: "sessionMedium" }, { name: "sessionDefaultChannelGroup" }];

  const request = withRowLimit({ dateRanges, metrics: METRICS, dimensions }, query.limit);
  const raw = await runQuery.runReport(propertyId, request as Parameters<typeof runQuery.runReport>[1], "topSources");
  const rows = (raw.rows ?? []) as Row[];

  if (!previousDateRange) {
    return { rows: rows.map(convertRowToTopSourcesRow) };
  }

  const buckets = bucketByDateRange(rows, ["current", "previous"]);
  const currentRows = buckets.current.map(convertRowToTopSourcesRow);

  const previousRowsByKey = new Map<string, TopSourcesRow>();
  for (const row of buckets.previous.map(convertRowToTopSourcesRow)) {
    previousRowsByKey.set(buildSourceKey(row), row);
  }

  const comparisonRows = currentRows
    .map((row) => previousRowsByKey.get(buildSourceKey(row)))
    .filter((row): row is TopSourcesRow => Boolean(row));

  return {
    rows: currentRows,
    comparison: { rows: comparisonRows },
  };
}

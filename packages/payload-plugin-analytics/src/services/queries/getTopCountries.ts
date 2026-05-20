import type { Row, TopCountriesResponse, TopCountriesRow, TopNQuery } from "../../types/query";
import { resolveDateRange } from "../../utils/date/resolveDateRange";
import { resolveComparison } from "../../utils/date/resolveComparison";
import { bucketByDateRange, convertMetricToNumber, dateRangesFor, withRowLimit } from "../../utils/ga4";
import { runQuery } from "../analyticsService/runQuery";

const METRICS = [{ name: "sessions" }, { name: "totalUsers" }];

function convertRowToTopCountriesRow(row: Row): TopCountriesRow {
  const dimensionValues = row.dimensionValues ?? [];
  const metricValues = row.metricValues ?? [];

  return {
    country: dimensionValues[0]?.value ?? "",
    city: dimensionValues[1]?.value ?? "",
    sessions: convertMetricToNumber(metricValues[0]?.value),
    users: convertMetricToNumber(metricValues[1]?.value),
  };
}

function buildCountryKey(row: TopCountriesRow): string {
  return `${row.country}|${row.city}`;
}

export async function getTopCountries(propertyId: string, query: TopNQuery): Promise<TopCountriesResponse> {
  const dateRange = resolveDateRange(query.dateRange);
  const previousDateRange = query.comparison?.kind === "previous-period" ? resolveComparison(dateRange) : undefined;
  const dateRanges = dateRangesFor(dateRange, previousDateRange);

  const dimensions =
    previousDateRange ?
      [{ name: "country" }, { name: "city" }, { name: "dateRange" }]
    : [{ name: "country" }, { name: "city" }];

  const request = withRowLimit({ dateRanges, metrics: METRICS, dimensions }, query.limit);
  const raw = await runQuery.runReport(propertyId, request as Parameters<typeof runQuery.runReport>[1], "topCountries");
  const rows = (raw.rows ?? []) as Row[];

  if (!previousDateRange) {
    return { rows: rows.map(convertRowToTopCountriesRow) };
  }

  const buckets = bucketByDateRange(rows, ["current", "previous"]);
  const currentRows = buckets.current.map(convertRowToTopCountriesRow);

  const previousRowsByKey = new Map<string, TopCountriesRow>();
  for (const row of buckets.previous.map(convertRowToTopCountriesRow)) {
    previousRowsByKey.set(buildCountryKey(row), row);
  }

  const comparisonRows = currentRows
    .map((row) => previousRowsByKey.get(buildCountryKey(row)))
    .filter((row): row is TopCountriesRow => Boolean(row));

  return {
    rows: currentRows,
    comparison: { rows: comparisonRows },
  };
}

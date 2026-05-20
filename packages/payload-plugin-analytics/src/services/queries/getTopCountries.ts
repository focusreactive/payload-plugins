import type { Row, TopCountriesQuery, TopCountriesResponse, TopCountriesRow } from "../../types/query";
import { resolveDateRange } from "../../utils/date/resolveDateRange";
import { resolveComparison } from "../../utils/date/resolveComparison";
import { bucketByDateRange, convertMetricToNumber, dateRangesFor, withRowLimit } from "../../utils/ga4";
import { runQuery } from "../analyticsService/runQuery";

const METRICS = [{ name: "sessions" }, { name: "totalUsers" }];

function convertRow(row: Row, dimension: "country" | "city"): TopCountriesRow {
  const dim = row.dimensionValues ?? [];
  const metrics = row.metricValues ?? [];
  const sessions = convertMetricToNumber(metrics[0]?.value);
  const users = convertMetricToNumber(metrics[1]?.value);

  if (dimension === "city") {
    return {
      city: dim[0]?.value ?? "",
      country: dim[1]?.value ?? "",
      sessions,
      users,
    };
  }

  return {
    country: dim[0]?.value ?? "",
    city: "",
    sessions,
    users,
  };
}

function buildJoinKey(row: TopCountriesRow, dimension: "country" | "city"): string {
  return dimension === "city" ? `${row.city}|${row.country}` : row.country;
}

function dimensionsFor(dimension: "country" | "city", withCompare: boolean) {
  const base = dimension === "city" ? [{ name: "city" }, { name: "country" }] : [{ name: "country" }];

  return withCompare ? [...base, { name: "dateRange" }] : base;
}

export async function getTopCountries(propertyId: string, query: TopCountriesQuery): Promise<TopCountriesResponse> {
  const dimension: "country" | "city" = query.dimension ?? "country";
  const dateRange = resolveDateRange(query.dateRange);
  const previousDateRange = query.comparison?.kind === "previous-period" ? resolveComparison(dateRange) : undefined;
  const dateRanges = dateRangesFor(dateRange, previousDateRange);

  const dimensions = dimensionsFor(dimension, Boolean(previousDateRange));

  const request = withRowLimit({ dateRanges, metrics: METRICS, dimensions }, query.limit);
  const raw = await runQuery.runReport(propertyId, request as Parameters<typeof runQuery.runReport>[1], "topCountries");
  const rows = (raw.rows ?? []) as Row[];

  if (!previousDateRange) {
    return { rows: rows.map((row) => convertRow(row, dimension)) };
  }

  const buckets = bucketByDateRange(rows, ["current", "previous"]);
  const currentRows = buckets.current.map((row) => convertRow(row, dimension));

  const previousRowsByKey = new Map<string, TopCountriesRow>();
  for (const row of buckets.previous.map((r) => convertRow(r, dimension))) {
    previousRowsByKey.set(buildJoinKey(row, dimension), row);
  }

  const comparisonRows = currentRows
    .map((row) => previousRowsByKey.get(buildJoinKey(row, dimension)))
    .filter((row): row is TopCountriesRow => Boolean(row));

  return {
    rows: currentRows,
    comparison: { rows: comparisonRows },
  };
}

import type { Row, TopNQuery, TopPagesResponse, TopPagesRow } from "../../types/query";
import type { PageFilterContext } from "../pageFilter/types";
import { resolveDateRange } from "../../utils/date/resolveDateRange";
import { resolveComparison } from "../../utils/date/resolveComparison";
import {
  bucketByDateRange,
  convertMetricToNumber,
  dateRangesFor,
  withInListFilter,
  withRowLimit,
} from "../../utils/ga4";
import { aggregateByRef } from "../../utils/ga4/aggregateByRef";
import { runQuery } from "../analyticsService/runQuery";

const METRICS = [
  { name: "screenPageViews" },
  { name: "sessions" },
  { name: "averageSessionDuration" },
];

function convertRowToTopPagesRow(row: Row): TopPagesRow {
  const dimensionValues = row.dimensionValues ?? [];
  const metricValues = row.metricValues ?? [];

  return {
    pagePath: dimensionValues[0]?.value ?? "",
    pageTitle: dimensionValues[1]?.value ?? "",
    pageViews: convertMetricToNumber(metricValues[0]?.value),
    sessions: convertMetricToNumber(metricValues[1]?.value),
    avgTime: convertMetricToNumber(metricValues[2]?.value),
  };
}

function sumPageViews(rows: TopPagesRow[]): number {
  return rows.reduce((sum, row) => sum + row.pageViews, 0);
}

async function getTopPagesLegacy(
  propertyId: string,
  query: TopNQuery,
  dateRanges: ReturnType<typeof dateRangesFor>,
  previousDateRange: unknown
): Promise<TopPagesResponse> {
  const request = withRowLimit(
    { dateRanges, metrics: METRICS, dimensions: [{ name: "pagePath" }, { name: "pageTitle" }] },
    query.limit
  );
  const raw = await runQuery.runReport(
    propertyId,
    request as Parameters<typeof runQuery.runReport>[1],
    "topPages"
  );
  const rows = (raw.rows ?? []) as Row[];

  if (!previousDateRange) {
    const currentRows = rows.map(convertRowToTopPagesRow);

    return { rows: currentRows, total: sumPageViews(currentRows) };
  }

  const buckets = bucketByDateRange(rows, ["current", "previous"]);
  const currentRows = buckets.current.map(convertRowToTopPagesRow);

  const previousRowsByPath = new Map<string, TopPagesRow>();
  for (const row of buckets.previous.map(convertRowToTopPagesRow)) {
    previousRowsByPath.set(row.pagePath, row);
  }

  const comparisonRows = currentRows
    .map((row) => previousRowsByPath.get(row.pagePath))
    .filter((row): row is TopPagesRow => row !== undefined);

  return {
    rows: currentRows,
    total: sumPageViews(currentRows),
    comparison: {
      rows: comparisonRows,
      total: sumPageViews(comparisonRows),
    },
  };
}

async function rowsByRefToTopPages(
  refMetrics: Map<string, number[]>,
  pageFilter: PageFilterContext
): Promise<TopPagesRow[]> {
  const refs = [...refMetrics.keys()];
  const labels = await pageFilter.resolveLabels(refs);

  return refs.map((ref) => {
    const [views = 0, sessions = 0, durSum = 0] = refMetrics.get(ref) ?? [];
    const label = labels.get(ref);

    return {
      pagePath: label?.path ?? ref,
      pageTitle: label?.title ?? ref,
      pageViews: views,
      sessions,
      avgTime: durSum,
    };
  });
}

export async function getTopPages(
  propertyId: string,
  query: TopNQuery,
  pageFilter?: PageFilterContext | null
): Promise<TopPagesResponse> {
  const dateRange = resolveDateRange(query.dateRange);
  const previousDateRange =
    query.comparison?.kind === "previous-period" ? resolveComparison(dateRange) : undefined;
  const dateRanges = dateRangesFor(dateRange, previousDateRange);

  if (!pageFilter || pageFilter.refs.length === 0) {
    return getTopPagesLegacy(propertyId, query, dateRanges, previousDateRange);
  }

  const request = withInListFilter(
    withRowLimit(
      { dateRanges, metrics: METRICS, dimensions: [{ name: pageFilter.pageRefDim }] },
      query.limit
    ),
    pageFilter.pageRefDim,
    pageFilter.refs
  );
  const raw = await runQuery.runReport(
    propertyId,
    request as Parameters<typeof runQuery.runReport>[1],
    "topPages"
  );
  const rows = (raw.rows ?? []) as Row[];

  if (!previousDateRange) {
    const currentRows = await rowsByRefToTopPages(aggregateByRef(rows, 0, 3), pageFilter);

    return { rows: currentRows, total: sumPageViews(currentRows) };
  }

  const buckets = bucketByDateRange(rows, ["current", "previous"]);
  const currentRows = await rowsByRefToTopPages(aggregateByRef(buckets.current, 0, 3), pageFilter);
  const previousRows = await rowsByRefToTopPages(
    aggregateByRef(buckets.previous, 0, 3),
    pageFilter
  );
  const previousRowsByPath = new Map(previousRows.map((row) => [row.pagePath, row]));
  const comparisonRows = currentRows
    .map((row) => previousRowsByPath.get(row.pagePath))
    .filter((row): row is TopPagesRow => row !== undefined);

  return {
    rows: currentRows,
    total: sumPageViews(currentRows),
    comparison: {
      rows: comparisonRows,
      total: sumPageViews(comparisonRows),
    },
  };
}

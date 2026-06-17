import type { Row, TopEventsResponse, TopEventsRow, TopNQuery } from "../../types/query";
import type { PageFilterContext } from "../pageFilter/types";
import { resolveDateRange } from "../../utils/date/resolveDateRange";
import { resolveComparison } from "../../utils/date/resolveComparison";
import { bucketByDateRange, convertMetricToNumber, dateRangesFor, withRowLimit } from "../../utils/ga4";
import { DEFAULT_PAGE_DIMENSIONS } from "../../constants/page";
import { withPageRefFilter } from "../../utils/ga4/withPageRefFilter";
import { runQuery } from "../analyticsService/runQuery";

const METRICS = [{ name: "eventCount" }, { name: "eventCountPerUser" }];

function convertRowToTopEventsRow(row: Row): TopEventsRow {
  const dimensionValues = row.dimensionValues ?? [];
  const metricValues = row.metricValues ?? [];

  return {
    eventName: dimensionValues[0]?.value ?? "",
    eventCount: convertMetricToNumber(metricValues[0]?.value),
    eventCountPerUser: convertMetricToNumber(metricValues[1]?.value),
  };
}

export async function getTopEvents(propertyId: string, query: TopNQuery, pageFilter?: PageFilterContext | null): Promise<TopEventsResponse> {
  const dateRange = resolveDateRange(query.dateRange);
  const previousDateRange = query.comparison?.kind === "previous-period" ? resolveComparison(dateRange) : undefined;
  const dateRanges = dateRangesFor(dateRange, previousDateRange);

  const dimensions = [{ name: "eventName" }];

  const request = withRowLimit({ dateRanges, metrics: METRICS, dimensions }, query.limit);
  const refs = pageFilter?.refs ?? [];
  const filtered = withPageRefFilter(request, pageFilter?.pageRefDim ?? DEFAULT_PAGE_DIMENSIONS.pageRef, refs);
  const raw = await runQuery.runReport(propertyId, filtered as Parameters<typeof runQuery.runReport>[1], "topEvents");
  const rows = (raw.rows ?? []) as Row[];

  if (!previousDateRange) {
    return { rows: rows.map(convertRowToTopEventsRow) };
  }

  const buckets = bucketByDateRange(rows, ["current", "previous"]);
  const currentRows = buckets.current.map(convertRowToTopEventsRow);

  const previousRowsByEventName = new Map<string, TopEventsRow>();
  for (const row of buckets.previous.map(convertRowToTopEventsRow)) {
    previousRowsByEventName.set(row.eventName, row);
  }

  const comparisonRows = currentRows.map((row) => previousRowsByEventName.get(row.eventName)).filter((row): row is TopEventsRow => row !== undefined);

  return {
    rows: currentRows,
    comparison: { rows: comparisonRows },
  };
}

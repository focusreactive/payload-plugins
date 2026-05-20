import type { AnalyticsQuery, LeadActionsCurrent, LeadActionsResponse, Row } from "../../types/query";
import type { LeadActionKind } from "../../types/events";
import { LEAD_ACTION_EVENTS } from "../../constants/events";
import { resolveDateRange } from "../../utils/date/resolveDateRange";
import { resolveComparison } from "../../utils/date/resolveComparison";
import {
  bucketByDateRange,
  convertMetricToNumber,
  dateRangesFor,
  deriveMissing,
  leadActionFilter,
} from "../../utils/ga4";
import { mapGa4Error } from "../../endpoints/errorMapping";
import { runQuery } from "../analyticsService/runQuery";

const LEAD_ACTION_KINDS = Object.values(LEAD_ACTION_EVENTS) as LeadActionKind[];

function buildEmptyLeadActionsCurrent(): LeadActionsCurrent {
  const zeroPerKind = Object.fromEntries(LEAD_ACTION_KINDS.map((kind) => [kind, 0])) as Record<LeadActionKind, number>;

  return { totals: { ...zeroPerKind }, conversionRate: { ...zeroPerKind }, perPage: [], avgTimeToAction: 0 };
}

function aggregate(eventRows: Row[], totalSessions: number, elapsedMsAvailable: boolean): LeadActionsCurrent {
  const current = buildEmptyLeadActionsCurrent();
  const countsByPage = new Map<string, Partial<Record<LeadActionKind, number>>>();

  let weightedSum = 0;
  let totalEventCount = 0;

  for (const row of eventRows) {
    const dimensionValues = row.dimensionValues ?? [];
    const metricValues = row.metricValues ?? [];

    const kind = dimensionValues[0]?.value as LeadActionKind | undefined;
    const pagePath = dimensionValues[1]?.value ?? "";
    const eventCount = convertMetricToNumber(metricValues[0]?.value);
    const avgElapsedMs = elapsedMsAvailable ? convertMetricToNumber(metricValues[1]?.value) : 0;

    if (!kind || !LEAD_ACTION_KINDS.includes(kind)) continue;

    current.totals[kind] += eventCount;
    totalEventCount += eventCount;
    weightedSum += avgElapsedMs * eventCount;

    const pageCounts = countsByPage.get(pagePath) ?? {};
    pageCounts[kind] = (pageCounts[kind] ?? 0) + eventCount;
    countsByPage.set(pagePath, pageCounts);
  }

  for (const kind of LEAD_ACTION_KINDS) {
    current.conversionRate[kind] = totalSessions > 0 ? current.totals[kind] / totalSessions : 0;
  }

  current.avgTimeToAction =
    !elapsedMsAvailable ? null
    : totalEventCount > 0 ? weightedSum / totalEventCount / 1000
    : 0;
  current.perPage = Array.from(countsByPage.entries()).map(([pagePath, counts]) => ({ pagePath, counts }));

  return current;
}

export async function getLeadActions(propertyId: string, query: AnalyticsQuery): Promise<LeadActionsResponse> {
  const dateRange = resolveDateRange(query.dateRange);
  const previousDateRange = query.comparison?.kind === "previous-period" ? resolveComparison(dateRange) : undefined;
  const dateRanges = dateRangesFor(dateRange, previousDateRange);

  const eventsRequest = {
    dateRanges,
    metrics: [{ name: "eventCount" }, { name: "averageCustomEvent:fr_elapsed_ms" }],
    dimensions:
      previousDateRange ?
        [{ name: "eventName" }, { name: "pagePath" }, { name: "dateRange" }]
      : [{ name: "eventName" }, { name: "pagePath" }],
    dimensionFilter: leadActionFilter(),
  };
  const sessionsRequest = {
    dateRanges,
    metrics: [{ name: "sessions" }],
    dimensions: previousDateRange ? [{ name: "dateRange" }] : [],
  };

  let elapsedMsAvailable = true;
  let batch;

  try {
    batch = await runQuery.batchRunReports(
      propertyId,
      [eventsRequest, sessionsRequest] as Parameters<typeof runQuery.batchRunReports>[1],
      "leadActions",
    );
  } catch (err) {
    const mapped = mapGa4Error(err);
    const matchesElapsedMs =
      mapped.setupRequired && deriveMissing({ message: mapped.message }, ["fr_elapsed_ms"])[0] === "fr_elapsed_ms";

    if (matchesElapsedMs) {
      elapsedMsAvailable = false;
      const fallbackEventsRequest = { ...eventsRequest, metrics: [{ name: "eventCount" }] };
      batch = await runQuery.batchRunReports(
        propertyId,
        [fallbackEventsRequest, sessionsRequest] as Parameters<typeof runQuery.batchRunReports>[1],
        "leadActions",
      );
    } else {
      throw err;
    }
  }

  const [eventsResponse, sessionsResponse] = batch.reports ?? [];
  const eventsRows = (eventsResponse?.rows ?? []) as Row[];
  const sessionsRows = (sessionsResponse?.rows ?? []) as Row[];

  let response: LeadActionsResponse;

  if (!previousDateRange) {
    const totalSessions = convertMetricToNumber(sessionsRows[0]?.metricValues?.[0]?.value);

    response = { current: aggregate(eventsRows, totalSessions, elapsedMsAvailable) };
  } else {
    const eventsBuckets = bucketByDateRange(eventsRows, ["current", "previous"]);
    const sessionsBuckets = bucketByDateRange(sessionsRows, ["current", "previous"]);
    const currentSessions = convertMetricToNumber(sessionsBuckets.current[0]?.metricValues?.[0]?.value);
    const previousSessions = convertMetricToNumber(sessionsBuckets.previous[0]?.metricValues?.[0]?.value);

    response = {
      current: aggregate(eventsBuckets.current, currentSessions, elapsedMsAvailable),
      comparison: aggregate(eventsBuckets.previous, previousSessions, elapsedMsAvailable),
    };
  }

  if (!elapsedMsAvailable) response.missing = ["fr_elapsed_ms"];

  return response;
}

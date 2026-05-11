import type { AnalyticsQuery, LeadActionsCurrent, LeadActionsResponse, Row } from "../../types/query";
import type { LeadActionKind } from "../../types/events";
import { LEAD_ACTION_EVENTS } from "../../constants/events";
import { resolveDateRange } from "../../utils/date/resolveDateRange";
import { resolveComparison } from "../../utils/date/resolveComparison";
import { bucketByDateRange, convertMetricToNumber, dateRangesFor, leadActionFilter } from "../../utils/ga4";
import { runQuery } from "../analyticsService/runQuery";

const LEAD_ACTION_KINDS = Object.values(LEAD_ACTION_EVENTS) as LeadActionKind[];

function buildEmptyLeadActionsCurrent(): LeadActionsCurrent {
  const zeroPerKind = Object.fromEntries(LEAD_ACTION_KINDS.map((kind) => [kind, 0])) as Record<LeadActionKind, number>;

  return { totals: { ...zeroPerKind }, conversionRate: { ...zeroPerKind }, perPage: [], avgTimeToAction: 0 };
}

function aggregate(eventRows: Row[], totalSessions: number): LeadActionsCurrent {
  const current = buildEmptyLeadActionsCurrent();
  const countsByPage = new Map<string, Partial<Record<LeadActionKind, number>>>();

  let totalEngagementSeconds = 0;
  let totalEventCount = 0;

  for (const row of eventRows) {
    const dimensionValues = row.dimensionValues ?? [];
    const metricValues = row.metricValues ?? [];

    const kind = dimensionValues[0]?.value as LeadActionKind | undefined;
    const pagePath = dimensionValues[1]?.value ?? "";
    const eventCount = convertMetricToNumber(metricValues[0]?.value);
    const engagementSeconds = convertMetricToNumber(metricValues[1]?.value);

    if (!kind || !LEAD_ACTION_KINDS.includes(kind)) continue;

    current.totals[kind] += eventCount;
    totalEventCount += eventCount;
    totalEngagementSeconds += engagementSeconds;

    const pageCounts = countsByPage.get(pagePath) ?? {};
    pageCounts[kind] = (pageCounts[kind] ?? 0) + eventCount;
    countsByPage.set(pagePath, pageCounts);
  }

  for (const kind of LEAD_ACTION_KINDS) {
    current.conversionRate[kind] = totalSessions > 0 ? current.totals[kind] / totalSessions : 0;
  }
  current.avgTimeToAction = totalEventCount > 0 ? totalEngagementSeconds / totalEventCount : 0;
  current.perPage = Array.from(countsByPage.entries()).map(([pagePath, counts]) => ({ pagePath, counts }));

  return current;
}

export async function getLeadActions(propertyId: string, query: AnalyticsQuery): Promise<LeadActionsResponse> {
  const dateRange = resolveDateRange(query.dateRange);
  const previousDateRange = query.comparison?.kind === "previous-period" ? resolveComparison(dateRange) : undefined;
  const dateRanges = dateRangesFor(dateRange, previousDateRange);

  const eventsRequest = {
    dateRanges,
    metrics: [{ name: "eventCount" }, { name: "userEngagementDuration" }],
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

  const batch = await runQuery.batchRunReports(propertyId, [eventsRequest, sessionsRequest] as Parameters<
    typeof runQuery.batchRunReports
  >[1]);
  const [eventsResponse, sessionsResponse] = batch.reports ?? [];

  const eventsRows = (eventsResponse?.rows ?? []) as Row[];
  const sessionsRows = (sessionsResponse?.rows ?? []) as Row[];

  if (!previousDateRange) {
    const totalSessions = convertMetricToNumber(sessionsRows[0]?.metricValues?.[0]?.value);

    return { current: aggregate(eventsRows, totalSessions) };
  }

  const eventsBuckets = bucketByDateRange(eventsRows, ["current", "previous"]);
  const sessionsBuckets = bucketByDateRange(sessionsRows, ["current", "previous"]);
  const currentSessions = convertMetricToNumber(sessionsBuckets.current[0]?.metricValues?.[0]?.value);
  const previousSessions = convertMetricToNumber(sessionsBuckets.previous[0]?.metricValues?.[0]?.value);

  return {
    current: aggregate(eventsBuckets.current, currentSessions),
    comparison: aggregate(eventsBuckets.previous, previousSessions),
  };
}

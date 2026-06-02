import type { AnalyticsQuery, LeadActionsCurrent, LeadActionsResponse, Row } from "../../types/query";
import { getPluginConfig } from "../../config";
import { resolveDateRange } from "../../utils/date/resolveDateRange";
import { resolveComparison } from "../../utils/date/resolveComparison";
import { bucketByDateRange, convertMetricToNumber, dateRangesFor, deriveMissing, leadActionFilter } from "../../utils/ga4";
import { resolveLeadActionTypes } from "../../utils/leadActions/resolveLeadActionTypes";
import { mapGa4Error } from "../../endpoints/errorMapping";
import { runQuery } from "../analyticsService/runQuery";

function buildEmptyCurrent(): LeadActionsCurrent {
  return { totals: {}, conversionRate: {}, perPage: [], avgTimeToAction: 0 };
}

function aggregate(eventRows: Row[], totalSessions: number, elapsedMsAvailable: boolean): LeadActionsCurrent {
  const current = buildEmptyCurrent();
  const countsByPage = new Map<string, Record<string, number>>();

  let weightedSum = 0;
  let totalEventCount = 0;

  for (const row of eventRows) {
    const dimensionValues = row.dimensionValues ?? [];
    const metricValues = row.metricValues ?? [];

    const leadType = dimensionValues[0]?.value;
    const pagePath = dimensionValues[1]?.value ?? "";
    const eventCount = convertMetricToNumber(metricValues[0]?.value);
    const avgElapsedMs = elapsedMsAvailable ? convertMetricToNumber(metricValues[1]?.value) : 0;

    if (!leadType) continue;

    current.totals[leadType] = (current.totals[leadType] ?? 0) + eventCount;
    totalEventCount += eventCount;
    weightedSum += avgElapsedMs * eventCount;

    const pageCounts = countsByPage.get(pagePath) ?? {};
    pageCounts[leadType] = (pageCounts[leadType] ?? 0) + eventCount;
    countsByPage.set(pagePath, pageCounts);
  }

  for (const [leadType, total] of Object.entries(current.totals)) {
    current.conversionRate[leadType] = totalSessions > 0 ? total / totalSessions : 0;
  }

  current.avgTimeToAction = !elapsedMsAvailable ? null : totalEventCount > 0 ? weightedSum / totalEventCount / 1000 : 0;
  current.perPage = Array.from(countsByPage.entries()).map(([pagePath, counts]) => ({ pagePath, counts }));

  return current;
}

export async function getLeadActions(propertyId: string, query: AnalyticsQuery): Promise<LeadActionsResponse> {
  const dateRange = resolveDateRange(query.dateRange);
  const previousDateRange = query.comparison?.kind === "previous-period" ? resolveComparison(dateRange) : undefined;
  const dateRanges = dateRangesFor(dateRange, previousDateRange);
  const types = resolveLeadActionTypes(getPluginConfig().leadActions?.types);

  const eventsRequest = {
    dateRanges,
    metrics: [{ name: "eventCount" }, { name: "averageCustomEvent:fr_elapsed_ms" }],
    dimensions: [{ name: "customEvent:fr_lead_type" }, { name: "pagePath" }],
    dimensionFilter: leadActionFilter(types),
  };
  const sessionsRequest = {
    dateRanges,
    metrics: [{ name: "sessions" }],
    dimensions: [],
  };

  let elapsedMsAvailable = true;
  let batch;

  try {
    batch = await runQuery.batchRunReports(propertyId, [eventsRequest, sessionsRequest] as Parameters<typeof runQuery.batchRunReports>[1], "leadActions");
  } catch (err) {
    const mapped = mapGa4Error(err);
    const missing = mapped.setupRequired ? deriveMissing({ message: mapped.message }, ["fr_elapsed_ms", "fr_lead_type"]) : [];

    if (missing.includes("fr_lead_type")) {
      return {
        current: buildEmptyCurrent(),
        missing: ["fr_lead_type"],
      };
    }

    if (missing.includes("fr_elapsed_ms")) {
      elapsedMsAvailable = false;
      const fallbackEventsRequest = { ...eventsRequest, metrics: [{ name: "eventCount" }] };
      batch = await runQuery.batchRunReports(propertyId, [fallbackEventsRequest, sessionsRequest] as Parameters<typeof runQuery.batchRunReports>[1], "leadActions");
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

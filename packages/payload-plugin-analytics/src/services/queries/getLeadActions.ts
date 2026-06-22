import type {
  AnalyticsQuery,
  LeadActionsCurrent,
  LeadActionsResponse,
  Row,
} from "../../types/query";
import type { PageFilterContext } from "../pageFilter/types";
import { getPluginConfig } from "../../config";
import { resolveDateRange } from "../../utils/date/resolveDateRange";
import { resolveComparison } from "../../utils/date/resolveComparison";
import {
  bucketByDateRange,
  convertMetricToNumber,
  dateRangesFor,
  deriveMissing,
  leadActionFilter,
} from "../../utils/ga4";
import { DEFAULT_PAGE_DIMENSIONS } from "../../constants/page";
import { withPageRefFilter } from "../../utils/ga4/withPageRefFilter";
import { resolveLeadActionTypes } from "../../utils/leadActions/resolveLeadActionTypes";
import { mapGa4Error } from "../../endpoints/errorMapping";
import { runQuery } from "../analyticsService/runQuery";

function buildEmptyCurrent(): LeadActionsCurrent {
  return { totals: {}, conversionRate: {}, perPage: [], avgTimeToAction: 0 };
}

interface AggregateResult {
  current: LeadActionsCurrent;
  perPageByKey: Map<string, Record<string, number>>;
}

function aggregate(
  eventRows: Row[],
  totalSessions: number,
  elapsedMsAvailable: boolean
): AggregateResult {
  const current = buildEmptyCurrent();
  const countsByPage = new Map<string, Record<string, number>>();

  let weightedSum = 0;
  let totalEventCount = 0;

  for (const row of eventRows) {
    const dimensionValues = row.dimensionValues ?? [];
    const metricValues = row.metricValues ?? [];

    const leadType = dimensionValues[0]?.value;
    const pageKey = dimensionValues[1]?.value ?? "";
    const eventCount = convertMetricToNumber(metricValues[0]?.value);
    const avgElapsedMs = elapsedMsAvailable ? convertMetricToNumber(metricValues[1]?.value) : 0;

    if (!leadType) continue;

    current.totals[leadType] = (current.totals[leadType] ?? 0) + eventCount;
    totalEventCount += eventCount;
    weightedSum += avgElapsedMs * eventCount;

    const pageCounts = countsByPage.get(pageKey) ?? {};
    pageCounts[leadType] = (pageCounts[leadType] ?? 0) + eventCount;
    countsByPage.set(pageKey, pageCounts);
  }

  for (const [leadType, total] of Object.entries(current.totals)) {
    current.conversionRate[leadType] = totalSessions > 0 ? total / totalSessions : 0;
  }

  current.avgTimeToAction = !elapsedMsAvailable
    ? null
    : totalEventCount > 0
      ? weightedSum / totalEventCount / 1000
      : 0;

  return { current, perPageByKey: countsByPage };
}

async function fillPerPage(
  result: AggregateResult,
  pageFilter?: PageFilterContext | null
): Promise<LeadActionsCurrent> {
  const { current, perPageByKey } = result;
  const labels = pageFilter ? await pageFilter.resolveLabels([...perPageByKey.keys()]) : null;

  current.perPage = Array.from(perPageByKey.entries()).map(([key, counts]) => ({
    pagePath: labels?.get(key)?.path ?? key,
    counts,
  }));

  return current;
}

export async function getLeadActions(
  propertyId: string,
  query: AnalyticsQuery,
  pageFilter?: PageFilterContext | null
): Promise<LeadActionsResponse> {
  const dateRange = resolveDateRange(query.dateRange);
  const previousDateRange =
    query.comparison?.kind === "previous-period" ? resolveComparison(dateRange) : undefined;
  const dateRanges = dateRangesFor(dateRange, previousDateRange);
  const types = resolveLeadActionTypes(getPluginConfig().leadActions?.types);

  const refs = pageFilter?.refs ?? [];
  const pageFilterActive = Boolean(pageFilter) && refs.length > 0;
  const pageRefDim = pageFilter?.pageRefDim ?? DEFAULT_PAGE_DIMENSIONS.pageRef;
  const pageDimension = pageFilterActive ? pageRefDim : "pagePath";

  const eventsRequest = withPageRefFilter(
    {
      dateRanges,
      metrics: [{ name: "eventCount" }, { name: "averageCustomEvent:fr_elapsed_ms" }],
      dimensions: [{ name: "customEvent:fr_lead_type" }, { name: pageDimension }],
      dimensionFilter: leadActionFilter(types),
    },
    pageRefDim,
    refs
  );
  const sessionsRequest = withPageRefFilter(
    {
      dateRanges,
      metrics: [{ name: "sessions" }],
      dimensions: [],
    },
    pageRefDim,
    refs
  );

  let elapsedMsAvailable = true;
  let batch;

  try {
    batch = await runQuery.batchRunReports(
      propertyId,
      [eventsRequest, sessionsRequest] as Parameters<typeof runQuery.batchRunReports>[1],
      "leadActions"
    );
  } catch (err) {
    const mapped = mapGa4Error(err);
    const missing = mapped.setupRequired
      ? deriveMissing({ message: mapped.message }, ["fr_elapsed_ms", "fr_lead_type"])
      : [];

    if (missing.includes("fr_lead_type")) {
      return {
        current: buildEmptyCurrent(),
        missing: ["fr_lead_type"],
      };
    }

    if (missing.includes("fr_elapsed_ms")) {
      elapsedMsAvailable = false;
      const fallbackEventsRequest = { ...eventsRequest, metrics: [{ name: "eventCount" }] };
      batch = await runQuery.batchRunReports(
        propertyId,
        [fallbackEventsRequest, sessionsRequest] as Parameters<typeof runQuery.batchRunReports>[1],
        "leadActions"
      );
    } else {
      throw err;
    }
  }

  const [eventsResponse, sessionsResponse] = batch.reports ?? [];
  const eventsRows = (eventsResponse?.rows ?? []) as Row[];
  const sessionsRows = (sessionsResponse?.rows ?? []) as Row[];

  let response: LeadActionsResponse;

  const filterForLabels = pageFilterActive ? pageFilter : null;

  if (!previousDateRange) {
    const totalSessions = convertMetricToNumber(sessionsRows[0]?.metricValues?.[0]?.value);
    response = {
      current: await fillPerPage(
        aggregate(eventsRows, totalSessions, elapsedMsAvailable),
        filterForLabels
      ),
    };
  } else {
    const eventsBuckets = bucketByDateRange(eventsRows, ["current", "previous"]);
    const sessionsBuckets = bucketByDateRange(sessionsRows, ["current", "previous"]);
    const currentSessions = convertMetricToNumber(
      sessionsBuckets.current[0]?.metricValues?.[0]?.value
    );
    const previousSessions = convertMetricToNumber(
      sessionsBuckets.previous[0]?.metricValues?.[0]?.value
    );

    response = {
      current: await fillPerPage(
        aggregate(eventsBuckets.current, currentSessions, elapsedMsAvailable),
        filterForLabels
      ),
      comparison: await fillPerPage(
        aggregate(eventsBuckets.previous, previousSessions, elapsedMsAvailable),
        filterForLabels
      ),
    };
  }

  if (!elapsedMsAvailable) response.missing = ["fr_elapsed_ms"];

  return response;
}

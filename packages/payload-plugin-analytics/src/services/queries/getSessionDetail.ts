import type { AnalyticsQuery, Row, SessionDetailEvent, SessionDetailResponse } from "../../types/query";
import type { PageFilterContext } from "../pageFilter/types";
import { FR_LEAD_TYPE_PARAM } from "../../constants/events";
import { resolveDateRange } from "../../utils/date/resolveDateRange";
import { dateRangesFor, deriveMissing } from "../../utils/ga4";
import { mapGa4Error } from "../../endpoints/errorMapping";
import { runQuery } from "../analyticsService/runQuery";

function convertDateHourMinuteToIso(value: string | null | undefined): string {
  if (!value || value.length !== 12) return "";

  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(8, 10)}:${value.slice(10, 12)}:00.000Z`;
}

function convertRowToSessionDetailEvent(row: Row, pageRefIndex: number, labels: Map<string, { path: string }> | null): SessionDetailEvent {
  const dimensionValues = row.dimensionValues ?? [];
  const leadType = dimensionValues[4]?.value ?? "";
  const params: Record<string, unknown> = {};

  if (leadType) params[FR_LEAD_TYPE_PARAM] = leadType;

  const rawPagePath = dimensionValues[1]?.value ?? undefined;
  const rowRef = pageRefIndex >= 0 ? (dimensionValues[pageRefIndex]?.value ?? "") : "";
  const pagePath = labels?.get(rowRef)?.path ?? rawPagePath;

  return {
    timestamp: convertDateHourMinuteToIso(dimensionValues[2]?.value),
    eventName: dimensionValues[0]?.value ?? "",
    pagePath,
    params,
  };
}

function buildRequest(sessionId: string, dateRange: ReturnType<typeof resolveDateRange>, includeLeadType: boolean, pageRefDim?: string) {
  const dimensions: Array<{ name: string }> = [{ name: "eventName" }, { name: "pagePath" }, { name: "dateHourMinute" }, { name: "customEvent:fr_event_seq" }];

  if (includeLeadType) dimensions.push({ name: "customEvent:fr_lead_type" });

  let pageRefIndex = -1;
  if (pageRefDim) {
    pageRefIndex = dimensions.length;
    dimensions.push({ name: pageRefDim });
  }

  const request = {
    dateRanges: dateRangesFor(dateRange),
    metrics: [{ name: "eventCount" }],
    dimensions,
    dimensionFilter: {
      filter: { fieldName: "customEvent:fr_session_id", stringFilter: { value: sessionId } },
    },
    orderBys: [{ dimension: { dimensionName: "dateHourMinute" } }, { dimension: { dimensionName: "customEvent:fr_event_seq" } }],
  };

  return { request, pageRefIndex };
}

async function resolveRowLabels(rows: Row[], pageRefIndex: number, pageFilter: PageFilterContext): Promise<Map<string, { path: string }>> {
  const refs = new Set<string>();
  for (const row of rows) {
    const ref = pageRefIndex >= 0 ? (row.dimensionValues?.[pageRefIndex]?.value ?? "") : "";
    if (ref) refs.add(ref);
  }

  return pageFilter.resolveLabels([...refs]);
}

function sessionRefsAllExisting(rows: Row[], pageRefIndex: number, existing: Set<string>): boolean {
  const refs = new Set<string>();
  for (const row of rows) refs.add(row.dimensionValues?.[pageRefIndex]?.value ?? "");

  if (refs.size === 0) return false;
  for (const ref of refs) {
    if (!existing.has(ref)) return false;
  }

  return true;
}

export async function getSessionDetail(propertyId: string, sessionId: string, query: AnalyticsQuery, pageFilter?: PageFilterContext | null): Promise<SessionDetailResponse> {
  const dateRange = resolveDateRange(query.dateRange);
  const filterRefs = pageFilter?.refs ?? [];
  const pageFilterActive = filterRefs.length > 0;
  const pageRefDim = pageFilterActive && pageFilter ? pageFilter.pageRefDim : undefined;
  const existingRefs = new Set(filterRefs);

  try {
    const { request, pageRefIndex } = buildRequest(sessionId, dateRange, true, pageRefDim);
    const raw = await runQuery.runReport(propertyId, request as Parameters<typeof runQuery.runReport>[1], "sessionDetail");
    const rows = (raw.rows ?? []) as Row[];

    if (pageFilterActive && !sessionRefsAllExisting(rows, pageRefIndex, existingRefs)) {
      return { sessionId, events: [] };
    }

    const labels = pageFilterActive && pageFilter ? await resolveRowLabels(rows, pageRefIndex, pageFilter) : null;

    return { sessionId, events: rows.map((row) => convertRowToSessionDetailEvent(row, pageRefIndex, labels)) };
  } catch (err) {
    const mapped = mapGa4Error(err);

    if (!mapped.setupRequired) throw err;

    const missing = deriveMissing({ message: mapped.message }, ["fr_session_id", "fr_event_seq", "fr_lead_type", "fr_page_ref"]);

    if (missing.length === 1 && missing[0] === "fr_lead_type") {
      try {
        const { request: fallbackRequest, pageRefIndex } = buildRequest(sessionId, dateRange, false, pageRefDim);
        const raw = await runQuery.runReport(propertyId, fallbackRequest as Parameters<typeof runQuery.runReport>[1], "sessionDetail");
        const rows = (raw.rows ?? []) as Row[];

        if (pageFilterActive && !sessionRefsAllExisting(rows, pageRefIndex, existingRefs)) {
          return { sessionId, events: [], missing };
        }

        const labels = pageFilterActive && pageFilter ? await resolveRowLabels(rows, pageRefIndex, pageFilter) : null;

        return { sessionId, events: rows.map((row) => convertRowToSessionDetailEvent(row, pageRefIndex, labels)), missing };
      } catch {
        // why: if the lead-type-less retry also fails, intentionally fall through
        // to the setupRequired return below rather than rethrowing.
      }
    }

    return {
      sessionId,
      setupRequired: true,
      missing,
      events: [],
    };
  }
}

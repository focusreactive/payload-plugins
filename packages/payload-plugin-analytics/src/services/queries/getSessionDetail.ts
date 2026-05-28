import type { AnalyticsQuery, Row, SessionDetailEvent, SessionDetailResponse } from "../../types/query";
import { FR_LEAD_TYPE_PARAM } from "../../constants/events";
import { resolveDateRange } from "../../utils/date/resolveDateRange";
import { dateRangesFor, deriveMissing } from "../../utils/ga4";
import { mapGa4Error } from "../../endpoints/errorMapping";
import { runQuery } from "../analyticsService/runQuery";

function convertDateHourMinuteToIso(value: string | null | undefined): string {
  if (!value || value.length !== 12) return "";

  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(8, 10)}:${value.slice(10, 12)}:00.000Z`;
}

function convertRowToSessionDetailEvent(row: Row): SessionDetailEvent {
  const dimensionValues = row.dimensionValues ?? [];
  const leadType = dimensionValues[4]?.value ?? "";
  const params: Record<string, unknown> = {};

  if (leadType) params[FR_LEAD_TYPE_PARAM] = leadType;

  return {
    timestamp: convertDateHourMinuteToIso(dimensionValues[2]?.value),
    eventName: dimensionValues[0]?.value ?? "",
    pagePath: dimensionValues[1]?.value ?? undefined,
    params,
  };
}

function buildRequest(sessionId: string, dateRange: ReturnType<typeof resolveDateRange>, includeLeadType: boolean) {
  const dimensions: Array<{ name: string }> = [
    { name: "eventName" },
    { name: "pagePath" },
    { name: "dateHourMinute" },
    { name: "customEvent:fr_event_seq" },
  ];

  if (includeLeadType) dimensions.push({ name: "customEvent:fr_lead_type" });

  return {
    dateRanges: dateRangesFor(dateRange),
    metrics: [{ name: "eventCount" }],
    dimensions,
    dimensionFilter: {
      filter: { fieldName: "customEvent:fr_session_id", stringFilter: { value: sessionId } },
    },
    orderBys: [
      { dimension: { dimensionName: "dateHourMinute" } },
      { dimension: { dimensionName: "customEvent:fr_event_seq" } },
    ],
  };
}

export async function getSessionDetail(
  propertyId: string,
  sessionId: string,
  query: AnalyticsQuery,
): Promise<SessionDetailResponse> {
  const dateRange = resolveDateRange(query.dateRange);

  try {
    const request = buildRequest(sessionId, dateRange, true);
    const raw = await runQuery.runReport(
      propertyId,
      request as Parameters<typeof runQuery.runReport>[1],
      "sessionDetail",
    );
    const rows = (raw.rows ?? []) as Row[];

    return { sessionId, events: rows.map(convertRowToSessionDetailEvent) };
  } catch (err) {
    const mapped = mapGa4Error(err);

    if (!mapped.setupRequired) throw err;

    const missing = deriveMissing({ message: mapped.message }, ["fr_session_id", "fr_event_seq", "fr_lead_type"]);

    if (missing.length === 1 && missing[0] === "fr_lead_type") {
      try {
        const fallbackRequest = buildRequest(sessionId, dateRange, false);
        const raw = await runQuery.runReport(
          propertyId,
          fallbackRequest as Parameters<typeof runQuery.runReport>[1],
          "sessionDetail",
        );
        const rows = (raw.rows ?? []) as Row[];

        return { sessionId, events: rows.map(convertRowToSessionDetailEvent), missing };
      } catch {}
    }

    return {
      sessionId,
      setupRequired: true,
      missing,
      events: [],
    };
  }
}

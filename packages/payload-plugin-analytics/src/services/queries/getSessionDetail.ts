import type { AnalyticsQuery, Row, SessionDetailEvent, SessionDetailResponse } from "../../types/query";
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

  return {
    timestamp: convertDateHourMinuteToIso(dimensionValues[2]?.value),
    eventName: dimensionValues[0]?.value ?? "",
    pagePath: dimensionValues[1]?.value ?? undefined,
    params: {},
  };
}

export async function getSessionDetail(
  propertyId: string,
  sessionId: string,
  query: AnalyticsQuery,
): Promise<SessionDetailResponse> {
  const dateRange = resolveDateRange(query.dateRange);

  const request = {
    dateRanges: dateRangesFor(dateRange),
    metrics: [{ name: "eventCount" }],
    dimensions: [
      { name: "eventName" },
      { name: "pagePath" },
      { name: "dateHourMinute" },
      { name: "customEvent:fr_event_seq" },
    ],
    dimensionFilter: {
      filter: { fieldName: "customEvent:fr_session_id", stringFilter: { value: sessionId } },
    },
    orderBys: [
      { dimension: { dimensionName: "dateHourMinute" } },
      { dimension: { dimensionName: "customEvent:fr_event_seq" } },
    ],
  };

  try {
    const raw = await runQuery.runReport(propertyId, request as Parameters<typeof runQuery.runReport>[1]);
    const rows = (raw.rows ?? []) as Row[];

    return { sessionId, events: rows.map(convertRowToSessionDetailEvent) };
  } catch (err) {
    const mapped = mapGa4Error(err);

    if (mapped.setupRequired) {
      return {
        sessionId,
        setupRequired: true,
        missing: deriveMissing({ message: mapped.message }, ["fr_session_id", "fr_event_seq"]),
        events: [],
      };
    }

    throw err;
  }
}

import type { AnalyticsQuery, Row, SessionDetailEvent, SessionDetailResponse } from "../../types/query";
import { resolveDateRange } from "../../utils/date/resolveDateRange";
import { dateRangesFor, decodeSessionId } from "../../utils/ga4";
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
  const signature = decodeSessionId(sessionId);

  if (!signature) {
    throw Object.assign(new Error("Invalid sessionId"), { code: "INVALID_SESSION_ID" });
  }

  const dateRange = resolveDateRange(query.dateRange);

  const request = {
    dateRanges: dateRangesFor(dateRange),
    metrics: [{ name: "eventCount" }],
    dimensions: [{ name: "eventName" }, { name: "pagePath" }, { name: "dateHourMinute" }],
    dimensionFilter: {
      andGroup: {
        expressions: [
          { filter: { fieldName: "dateHourMinute", stringFilter: { value: signature.dhm } } },
          { filter: { fieldName: "sessionSource", stringFilter: { value: signature.src } } },
          { filter: { fieldName: "deviceCategory", stringFilter: { value: signature.dev } } },
          { filter: { fieldName: "country", stringFilter: { value: signature.ctr } } },
          { filter: { fieldName: "landingPagePlusQueryString", stringFilter: { value: signature.lp } } },
        ],
      },
    },
    orderBys: [{ dimension: { dimensionName: "dateHourMinute" } }],
  };

  const raw = await runQuery.runReport(propertyId, request as Parameters<typeof runQuery.runReport>[1]);
  const rows = (raw.rows ?? []) as Row[];

  const events: SessionDetailEvent[] = rows.map(convertRowToSessionDetailEvent);

  return { sessionId, events };
}

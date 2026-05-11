import type { DeviceCategory, Row, SessionsListQuery, SessionsResponse, SessionsRow } from "../../types/query";
import { resolveDateRange } from "../../utils/date/resolveDateRange";
import { convertMetricToNumber, dateRangesFor, encodeSessionId, leadActionFilter, withRowLimit } from "../../utils/ga4";
import { runQuery } from "../analyticsService/runQuery";

const DEFAULT_PAGE_SIZE = 50;

interface CursorPayload {
  offset: number;
}

function decodeCursor(cursor: string | undefined): number {
  if (!cursor) return 0;

  try {
    const payload = JSON.parse(Buffer.from(cursor, "base64").toString("utf8")) as CursorPayload;

    return typeof payload.offset === "number" ? Math.max(0, Math.trunc(payload.offset)) : 0;
  } catch {
    throw Object.assign(new Error("Invalid cursor"), { code: "INVALID_CURSOR" });
  }
}

function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ offset })).toString("base64");
}

function normaliseDeviceCategory(value: string | null | undefined): DeviceCategory {
  return value === "desktop" || value === "mobile" || value === "tablet" ? value : "other";
}

function convertDateHourMinuteToIso(value: string | null | undefined): string {
  if (!value || value.length !== 12) return "";

  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(8, 10)}:${value.slice(10, 12)}:00.000Z`;
}

function convertRowToSessionsRow(row: Row, hadLeadAction: boolean): SessionsRow {
  const dimensionValues = row.dimensionValues ?? [];
  const metricValues = row.metricValues ?? [];

  const landingPage = dimensionValues[0]?.value ?? "";
  const source = dimensionValues[1]?.value ?? "";
  const deviceCategory = normaliseDeviceCategory(dimensionValues[2]?.value);
  const country = dimensionValues[3]?.value ?? "";
  const dhm = dimensionValues[4]?.value ?? "";

  return {
    sessionId: encodeSessionId({ dhm, src: source, dev: deviceCategory, ctr: country, lp: landingPage }),
    landingPage,
    source,
    deviceCategory,
    country,
    startedAt: convertDateHourMinuteToIso(dhm),
    eventCount: convertMetricToNumber(metricValues[0]?.value),
    hadLeadAction,
  };
}

export async function listSessions(propertyId: string, query: SessionsListQuery): Promise<SessionsResponse> {
  const dateRange = resolveDateRange(query.dateRange);
  const offset = decodeCursor(query.cursor);
  const limit = query.limit ?? DEFAULT_PAGE_SIZE;

  const dimensions = [
    { name: "landingPagePlusQueryString" },
    { name: "sessionSource" },
    { name: "deviceCategory" },
    { name: "country" },
    { name: "dateHourMinute" },
  ];

  let request: Record<string, unknown> = withRowLimit(
    {
      dateRanges: dateRangesFor(dateRange),
      metrics: [{ name: "eventCount" }],
      dimensions,
      offset,
      orderBys: [{ dimension: { dimensionName: "dateHourMinute" }, desc: true }],
    },
    limit,
  );

  if (query.hadLeadAction)
    request = {
      ...request,
      dimensionFilter: leadActionFilter(),
    };

  const raw = await runQuery.runReport(propertyId, request as Parameters<typeof runQuery.runReport>[1]);
  const rows = (raw.rows ?? []) as Row[];

  const hadLeadAction = Boolean(query.hadLeadAction);
  const sessionsRows: SessionsRow[] = rows.slice(0, limit).map((row) => convertRowToSessionsRow(row, hadLeadAction));

  const totalRows = raw.rowCount ?? rows.length;
  const nextOffset = offset + sessionsRows.length;
  const hasMore = nextOffset < totalRows;

  return {
    rows: sessionsRows,
    pagination: { cursor: hasMore ? encodeCursor(nextOffset) : null, hasMore },
  };
}

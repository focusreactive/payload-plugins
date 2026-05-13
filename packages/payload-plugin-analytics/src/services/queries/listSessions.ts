import type { DeviceCategory, Row, SessionsListQuery, SessionsResponse, SessionsRow } from "../../types/query";
import { resolveDateRange } from "../../utils/date/resolveDateRange";
import { convertMetricToNumber, dateRangesFor, deriveMissing, leadActionFilter, withRowLimit } from "../../utils/ga4";
import { mapGa4Error } from "../../endpoints/errorMapping";
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

interface DimensionFilter {
  filter?: {
    fieldName: string;
    stringFilter?: { value: string };
    inListFilter?: { values: string[] };
  };
  andGroup?: {
    expressions: DimensionFilter[];
  };
}

function stringFilter(fieldName: string, value: string): DimensionFilter {
  return { filter: { fieldName, stringFilter: { value } } };
}

function combineFilters(filters: DimensionFilter[]): DimensionFilter | undefined {
  if (filters.length === 0) return undefined;
  if (filters.length === 1) return filters[0];

  return { andGroup: { expressions: filters } };
}

function convertRowToSessionsRow(row: Row, hadLeadAction: boolean): SessionsRow {
  const dimensionValues = row.dimensionValues ?? [];
  const metricValues = row.metricValues ?? [];

  const sessionId = dimensionValues[0]?.value ?? "";
  const landingPage = dimensionValues[1]?.value ?? "";
  const source = dimensionValues[2]?.value ?? "";
  const deviceCategory = normaliseDeviceCategory(dimensionValues[3]?.value);
  const country = dimensionValues[4]?.value ?? "";
  const dhm = dimensionValues[5]?.value ?? "";

  return {
    sessionId,
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
    { name: "customEvent:fr_session_id" },
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

  const filters: DimensionFilter[] = [];

  if (query.hadLeadAction) filters.push(leadActionFilter() as DimensionFilter);
  if (query.source) filters.push(stringFilter("sessionSource", query.source));
  if (query.device) filters.push(stringFilter("deviceCategory", query.device));
  if (query.country) filters.push(stringFilter("country", query.country));

  const combined = combineFilters(filters);

  if (combined) {
    request = { ...request, dimensionFilter: combined };
  }

  try {
    const raw = await runQuery.runReport(propertyId, request as Parameters<typeof runQuery.runReport>[1]);
    const rows = (raw.rows ?? []) as Row[];

    const hadLeadAction = Boolean(query.hadLeadAction);
    const sessionsRows: SessionsRow[] = rows.slice(0, limit).map((row) => convertRowToSessionsRow(row, hadLeadAction));

    const totalRows = raw.rowCount ?? rows.length;
    const nextOffset = offset + sessionsRows.length;
    const hasMore = nextOffset < totalRows;

    return {
      rows: sessionsRows,
      pagination: {
        cursor: hasMore ? encodeCursor(nextOffset) : null,
        hasMore,
      },
    };
  } catch (err) {
    const mapped = mapGa4Error(err);

    if (mapped.setupRequired) {
      return {
        setupRequired: true,
        missing: deriveMissing({ message: mapped.message }, ["fr_session_id"]),
        rows: [],
        pagination: { cursor: null, hasMore: false },
      };
    }

    throw err;
  }
}

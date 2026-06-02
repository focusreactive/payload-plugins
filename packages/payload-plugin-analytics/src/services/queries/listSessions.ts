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
    const payload = JSON.parse(Buffer.from(cursor, "base64").toString("utf-8")) as CursorPayload;

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

interface DimensionFilter {
  filter?: {
    fieldName: string;
    stringFilter?: { matchType?: string; value: string };
    inListFilter?: { values: string[] };
  };
  andGroup?: { expressions: DimensionFilter[] };
  notExpression?: DimensionFilter;
}

function stringFilter(fieldName: string, value: string): DimensionFilter {
  return { filter: { fieldName, stringFilter: { value } } };
}

function excludeNotSet(fieldName: string): DimensionFilter {
  return {
    notExpression: {
      filter: { fieldName, stringFilter: { matchType: "EXACT", value: "(not set)" } },
    },
  };
}

function combineFilters(filters: DimensionFilter[]): DimensionFilter | undefined {
  if (filters.length === 0) return undefined;
  if (filters.length === 1) return filters[0];

  return { andGroup: { expressions: filters } };
}

interface MergedSession {
  sessionId: string;
  landingPage: string;
  source: string;
  startedAt: string;
  devices: Set<DeviceCategory>;
  countries: Set<string>;
  eventCount: number;
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
    { name: "customEvent:fr_session_start" },
  ];

  let sessionsRequest: Record<string, unknown> = withRowLimit(
    {
      dateRanges: dateRangesFor(dateRange),
      metrics: [{ name: "eventCount" }],
      dimensions,
      offset,
      orderBys: [{ dimension: { dimensionName: "customEvent:fr_session_start" }, desc: true }],
    },
    limit
  );

  const filters: DimensionFilter[] = [excludeNotSet("customEvent:fr_session_id"), excludeNotSet("customEvent:fr_session_start")];

  if (query.hadLeadAction) filters.push(leadActionFilter() as DimensionFilter);
  if (query.source) filters.push(stringFilter("sessionSource", query.source));
  if (query.device) filters.push(stringFilter("deviceCategory", query.device));
  if (query.country) filters.push(stringFilter("country", query.country));

  const combined = combineFilters(filters);

  if (combined) {
    sessionsRequest = { ...sessionsRequest, dimensionFilter: combined };
  }

  const leadSessionsRequest = {
    dateRanges: dateRangesFor(dateRange),
    metrics: [{ name: "eventCount" }],
    dimensions: [{ name: "customEvent:fr_session_id" }],
    dimensionFilter: combineFilters([excludeNotSet("customEvent:fr_session_id"), leadActionFilter() as DimensionFilter]),
  };

  try {
    const batch = await runQuery.batchRunReports(propertyId, [sessionsRequest, leadSessionsRequest] as Parameters<typeof runQuery.batchRunReports>[1], "sessions");

    const [sessionsReport, leadSessionsReport] = batch.reports ?? [];
    const rows = (sessionsReport?.rows ?? []) as Row[];
    const leadRows = (leadSessionsReport?.rows ?? []) as Row[];

    const leadSessionIds = new Set<string>();

    for (const row of leadRows) {
      const id = row.dimensionValues?.[0]?.value ?? "";

      if (id) leadSessionIds.add(id);
    }

    const merged = new Map<string, MergedSession>();

    for (const row of rows) {
      const dv = row.dimensionValues ?? [];
      const mv = row.metricValues ?? [];
      const id = dv[0]?.value ?? "";
      if (!id) continue;

      const device = normaliseDeviceCategory(dv[3]?.value);
      const country = dv[4]?.value ?? "";
      const events = convertMetricToNumber(mv[0]?.value);
      const startedAt = dv[5]?.value ?? "";

      const existing = merged.get(id);
      if (existing) {
        existing.devices.add(device);
        if (country) existing.countries.add(country);
        existing.eventCount += events;
        if (startedAt && (!existing.startedAt || startedAt < existing.startedAt)) {
          existing.startedAt = startedAt;
        }
      } else {
        const devices = new Set<DeviceCategory>([device]);
        const countries = new Set<string>();
        if (country) countries.add(country);

        merged.set(id, {
          sessionId: id,
          landingPage: dv[1]?.value ?? "",
          source: dv[2]?.value ?? "",
          startedAt,
          devices,
          countries,
          eventCount: events,
        });
      }
    }

    const sessionsRows: SessionsRow[] = Array.from(merged.values())
      .slice(0, limit)
      .map((m) => ({
        sessionId: m.sessionId,
        landingPage: m.landingPage,
        source: m.source,
        deviceCategory: Array.from(m.devices),
        country: Array.from(m.countries),
        startedAt: m.startedAt,
        eventCount: m.eventCount,
        hadLeadAction: leadSessionIds.has(m.sessionId),
      }));

    const totalRows = sessionsReport?.rowCount ?? rows.length;
    const nextOffset = offset + rows.length;
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
        missing: deriveMissing({ message: mapped.message }, ["fr_session_id", "fr_session_start"]),
        rows: [],
        pagination: { cursor: null, hasMore: false },
      };
    }

    throw err;
  }
}

import type {
  DeviceCategory,
  Row,
  SessionsListQuery,
  SessionsResponse,
  SessionsRow,
} from "../../types/query";
import type { PageFilterContext } from "../pageFilter/types";
import { resolveDateRange } from "../../utils/date/resolveDateRange";
import {
  convertMetricToNumber,
  dateRangesFor,
  deriveMissing,
  leadActionFilter,
  withRowLimit,
} from "../../utils/ga4";
import { excludeDeletedSessions } from "../pageFilter/excludeDeletedSessions";
import { mapGa4Error } from "../../endpoints/errorMapping";
import { runQuery } from "../analyticsService/runQuery";
import { TRAFFIC_EVENTS } from "../../constants/events";

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

/**
 * Resolve the landing (first) page_view ref per session to its current CMS path.
 *
 * The session-aggregated query cannot tell which of a multi-page session's refs
 * is the LANDING ref, so we run a supplementary ordered event-level query and
 * take the FIRST page_view row per session as its landing event.
 *
 * why: a failing landing-ref query must not blank the sessions list — on ANY
 * error we return an empty Map and the caller falls back to the raw GA4
 * landingPagePlusQueryString.
 */
const LANDING_REF_ROW_LIMIT = 50_000;

async function resolveLandingPaths(
  propertyId: string,
  dateRange: ReturnType<typeof resolveDateRange>,
  pageFilter: PageFilterContext,
  sessionIds: string[]
): Promise<Map<string, string>> {
  try {
    const request = withRowLimit(
      {
        dateRanges: dateRangesFor(dateRange),
        metrics: [{ name: "eventCount" }],
        dimensions: [
          { name: "customEvent:fr_session_id" },
          { name: pageFilter.pageRefDim },
          { name: "dateHourMinute" },
          { name: "customEvent:fr_event_seq" },
        ],
        dimensionFilter: {
          andGroup: {
            expressions: [
              {
                filter: {
                  fieldName: "eventName",
                  stringFilter: { value: TRAFFIC_EVENTS.PAGE_VIEW },
                },
              },
              {
                filter: {
                  fieldName: "customEvent:fr_session_id",
                  inListFilter: { values: sessionIds },
                },
              },
            ],
          },
        },
        orderBys: [
          { dimension: { dimensionName: "customEvent:fr_session_id" } },
          { dimension: { dimensionName: "dateHourMinute" } },
          { dimension: { dimensionName: "customEvent:fr_event_seq" } },
        ],
      },
      LANDING_REF_ROW_LIMIT
    );

    const report = await runQuery.runReport(
      propertyId,
      request as Parameters<typeof runQuery.runReport>[1],
      "sessionLandingRefs"
    );
    const rows = (report.rows ?? []) as Row[];

    const landingRefBySession = new Map<string, string>();

    for (const row of rows) {
      const dv = row.dimensionValues ?? [];
      const id = dv[0]?.value ?? "";
      const ref = dv[1]?.value ?? "";

      if (!id || !ref) continue;
      // First row seen for a session (rows are ordered) is its landing event.
      if (!landingRefBySession.has(id)) landingRefBySession.set(id, ref);
    }

    const landingRefs = Array.from(landingRefBySession.values());
    const labels = await pageFilter.resolveLabels([...new Set(landingRefs)]);

    const pathBySession = new Map<string, string>();

    for (const [id, ref] of landingRefBySession) {
      const path = labels.get(ref)?.path;

      if (path) pathBySession.set(id, path);
    }

    return pathBySession;
  } catch {
    return new Map<string, string>();
  }
}

export async function listSessions(
  propertyId: string,
  query: SessionsListQuery,
  pageFilter?: PageFilterContext | null
): Promise<SessionsResponse> {
  const dateRange = resolveDateRange(query.dateRange);
  const offset = decodeCursor(query.cursor);
  const limit = query.limit ?? DEFAULT_PAGE_SIZE;
  const filterRefs = pageFilter?.refs ?? [];
  const pageFilterActive = filterRefs.length > 0;

  const dimensions = [
    { name: "customEvent:fr_session_id" },
    { name: "landingPagePlusQueryString" },
    { name: "sessionSource" },
    { name: "deviceCategory" },
    { name: "country" },
    { name: "customEvent:fr_session_start" },
  ];

  let pageRefDimIndex = -1;

  if (pageFilterActive && pageFilter) {
    pageRefDimIndex = dimensions.length;
    dimensions.push({ name: pageFilter.pageRefDim });
  }

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

  const filters: DimensionFilter[] = [
    excludeNotSet("customEvent:fr_session_id"),
    excludeNotSet("customEvent:fr_session_start"),
  ];

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
    dimensionFilter: combineFilters([
      excludeNotSet("customEvent:fr_session_id"),
      leadActionFilter() as DimensionFilter,
    ]),
  };

  try {
    const batch = await runQuery.batchRunReports(
      propertyId,
      [sessionsRequest, leadSessionsRequest] as Parameters<typeof runQuery.batchRunReports>[1],
      "sessions"
    );

    const [sessionsReport, leadSessionsReport] = batch.reports ?? [];
    const rows = (sessionsReport?.rows ?? []) as Row[];
    const leadRows = (leadSessionsReport?.rows ?? []) as Row[];

    const leadSessionIds = new Set<string>();

    for (const row of leadRows) {
      const id = row.dimensionValues?.[0]?.value ?? "";

      if (id) leadSessionIds.add(id);
    }

    const merged = new Map<string, MergedSession>();
    const refsBySession = new Map<string, Set<string>>();

    for (const row of rows) {
      const dv = row.dimensionValues ?? [];
      const mv = row.metricValues ?? [];
      const id = dv[0]?.value ?? "";
      if (!id) continue;

      const device = normaliseDeviceCategory(dv[3]?.value);
      const country = dv[4]?.value ?? "";
      const events = convertMetricToNumber(mv[0]?.value);
      const startedAt = dv[5]?.value ?? "";

      if (pageFilterActive) {
        const ref = dv[pageRefDimIndex]?.value ?? "";
        const set = refsBySession.get(id) ?? new Set<string>();
        set.add(ref);
        refsBySession.set(id, set);
      }

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

    let mergedSessions = Array.from(merged.values());

    if (pageFilterActive) {
      const allowed = excludeDeletedSessions(refsBySession, new Set(filterRefs));
      mergedSessions = mergedSessions.filter((m) => allowed.has(m.sessionId));
    }

    let landingPathBySession = new Map<string, string>();

    if (pageFilterActive && pageFilter) {
      const sessionIds = mergedSessions.map((m) => m.sessionId);

      if (sessionIds.length > 0) {
        landingPathBySession = await resolveLandingPaths(
          propertyId,
          dateRange,
          pageFilter,
          sessionIds
        );
      }
    }

    const sessionsRows: SessionsRow[] = mergedSessions.map((m) => ({
      sessionId: m.sessionId,
      landingPage: landingPathBySession.get(m.sessionId) ?? m.landingPage,
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
        missing: deriveMissing({ message: mapped.message }, [
          "fr_session_id",
          "fr_session_start",
          "fr_page_ref",
        ]),
        rows: [],
        pagination: { cursor: null, hasMore: false },
      };
    }

    throw err;
  }
}

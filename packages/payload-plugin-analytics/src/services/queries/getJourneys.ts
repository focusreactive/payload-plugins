import type { JourneyResponse, JourneyRow, JourneyStep, JourneysQuery, Row } from "../../types/query";
import { LEAD_ACTION_EVENT_NAME } from "../../constants/events";
import { resolveDateRange } from "../../utils/date/resolveDateRange";
import { dateRangesFor, deriveMissing, withRowLimit } from "../../utils/ga4";
import { mapGa4Error } from "../../endpoints/errorMapping";
import { runQuery } from "../analyticsService/runQuery";

interface OrderedRow {
  sessionId: string;
  eventName: string;
  pagePath: string;
  dhm: string;
  eventSeq: number;
  leadType: string;
}

function parseRow(row: Row): OrderedRow {
  const dim = row.dimensionValues ?? [];
  const seqRaw = dim[4]?.value ?? "";
  const seq = Number.parseInt(seqRaw, 10);

  return {
    sessionId: dim[0]?.value ?? "",
    eventName: dim[1]?.value ?? "",
    pagePath: dim[2]?.value ?? "",
    dhm: dim[3]?.value ?? "",
    eventSeq: Number.isFinite(seq) ? seq : Number.MAX_SAFE_INTEGER,
    leadType: dim[5]?.value ?? "",
  };
}

function sessionRowToJourneyStep(row: OrderedRow): JourneyStep {
  if (row.eventName === LEAD_ACTION_EVENT_NAME && row.leadType) {
    return {
      kind: "leadAction",
      value: row.leadType,
    };
  }
  return {
    kind: "page",
    value: row.pagePath,
  };
}

function collapseJourneyStepDuplicates(steps: JourneyStep[]): JourneyStep[] {
  const journeySteps: JourneyStep[] = [];
  for (const step of steps) {
    const prev = journeySteps[journeySteps.length - 1];
    if (prev && prev.kind === step.kind && prev.value === step.value) continue;
    journeySteps.push(step);
  }
  return journeySteps;
}

function groupBySession(rows: OrderedRow[]): Map<string, OrderedRow[]> {
  const rowsMap = new Map<string, OrderedRow[]>();
  for (const row of rows) {
    if (!row.sessionId) continue;
    const sessionRows = rowsMap.get(row.sessionId) ?? [];
    sessionRows.push(row);
    rowsMap.set(row.sessionId, sessionRows);
  }
  for (const sessionRows of rowsMap.values()) {
    sessionRows.sort((a, b) => (a.dhm === b.dhm ? a.eventSeq - b.eventSeq : a.dhm.localeCompare(b.dhm)));
  }
  return rowsMap;
}

export async function getJourneys(propertyId: string, query: JourneysQuery): Promise<JourneyResponse> {
  const dateRange = resolveDateRange(query.dateRange);
  const limit = query.limit ?? 20;
  const maxSteps = query.maxSteps;
  const sampleLimit = query.sampleLimit ?? 50_000;

  const request = withRowLimit(
    {
      dateRanges: dateRangesFor(dateRange),
      metrics: [{ name: "eventCount" }],
      dimensions: [
        { name: "customEvent:fr_session_id" },
        { name: "eventName" },
        { name: "pagePath" },
        { name: "dateHourMinute" },
        { name: "customEvent:fr_event_seq" },
        { name: "customEvent:fr_lead_type" },
      ],
      orderBys: [
        { dimension: { dimensionName: "customEvent:fr_session_id" } },
        { dimension: { dimensionName: "dateHourMinute" } },
        { dimension: { dimensionName: "customEvent:fr_event_seq" } },
      ],
    },
    sampleLimit,
  );

  let raw;
  try {
    raw = await runQuery.runReport(propertyId, request as Parameters<typeof runQuery.runReport>[1], "journeys");
  } catch (err) {
    const mapped = mapGa4Error(err);
    if (mapped.setupRequired) {
      return {
        setupRequired: true,
        missing: deriveMissing({ message: mapped.message }, ["fr_session_id", "fr_event_seq", "fr_lead_type"]),
        rows: [],
        sessionsConsidered: 0,
        truncated: false,
      };
    }
    throw err;
  }

  const rows = ((raw.rows ?? []) as Row[]).map(parseRow);
  const rowsMapBySession = groupBySession(rows);

  const journeysMapByPath = new Map<string, { path: JourneyStep[]; count: number }>();
  let sessionsConsidered = 0;

  for (const sessionRows of rowsMapBySession.values()) {
    if (!sessionRows.some((row) => row.eventName === LEAD_ACTION_EVENT_NAME)) continue;

    sessionsConsidered += 1;

    const journeySteps = collapseJourneyStepDuplicates(sessionRows.map(sessionRowToJourneyStep));
    const path = maxSteps === undefined ? journeySteps : journeySteps.slice(0, maxSteps);
    const pathKey = JSON.stringify(path);
    const existing = journeysMapByPath.get(pathKey);

    if (existing) existing.count += 1;
    else journeysMapByPath.set(pathKey, { path, count: 1 });
  }

  const sorted: JourneyRow[] = Array.from(journeysMapByPath.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(({ path, count }) => ({
      path,
      count,
      conversionRate: sessionsConsidered > 0 ? count / sessionsConsidered : 0,
    }));

  const totalRows = raw.rowCount ?? rows.length;

  return {
    rows: sorted,
    sessionsConsidered,
    truncated: totalRows > sampleLimit,
  };
}

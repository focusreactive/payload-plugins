import type { JourneyResponse, JourneyRow, JourneyStep, JourneysQuery, Row } from "../../types/query";
import { LEAD_ACTION_EVENTS } from "../../constants/events";
import { resolveDateRange } from "../../utils/date/resolveDateRange";
import { dateRangesFor, deriveMissing, withRowLimit } from "../../utils/ga4";
import { mapGa4Error } from "../../endpoints/errorMapping";
import { runQuery } from "../analyticsService/runQuery";

const LEAD_ACTION_EVENT_NAMES = new Set<string>(Object.values(LEAD_ACTION_EVENTS));

interface OrderedRow {
  sessionId: string;
  eventName: string;
  pagePath: string;
  dhm: string;
  eventSeq: number;
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
  };
}

function sessionRowToJourneyStep(row: OrderedRow): JourneyStep {
  if (LEAD_ACTION_EVENT_NAMES.has(row.eventName)) {
    return { kind: "leadAction", value: row.eventName };
  }

  return { kind: "page", value: row.pagePath };
}

function collapseJourneyStepDuplicates(steps: JourneyStep[]): JourneyStep[] {
  const journeySteps: JourneyStep[] = [];

  for (const step of steps) {
    const prevJourneyStep = journeySteps[journeySteps.length - 1];

    if (prevJourneyStep && prevJourneyStep.kind === step.kind && prevJourneyStep.value === step.value) continue;
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
    raw = await runQuery.runReport(propertyId, request as Parameters<typeof runQuery.runReport>[1]);
  } catch (err) {
    const mapped = mapGa4Error(err);

    if (mapped.setupRequired) {
      return {
        setupRequired: true,
        missing: deriveMissing({ message: mapped.message }, ["fr_session_id", "fr_event_seq"]),
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
    if (!sessionRows.some((row) => LEAD_ACTION_EVENT_NAMES.has(row.eventName))) continue;

    sessionsConsidered += 1;

    const journeySteps = collapseJourneyStepDuplicates(sessionRows.map(sessionRowToJourneyStep));
    const path = maxSteps === undefined ? journeySteps : journeySteps.slice(0, maxSteps);
    const pathKey = JSON.stringify(path);
    const existingPathKey = journeysMapByPath.get(pathKey);

    if (existingPathKey) existingPathKey.count += 1;
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

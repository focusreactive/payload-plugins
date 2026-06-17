import type { KpiCurrent, KpiSeriesPoint } from "../../../types/query";
import { TRAFFIC_EVENTS } from "../../../constants/events";
import { excludeDeletedSessions } from "../../pageFilter/excludeDeletedSessions";
import { isoFromGa4Date } from "../../../utils/ga4/isoFromGa4Date";

export interface KpiSessionEventRow {
  sessionId: string;
  /** GA4 "date" dim, yyyymmdd. */
  date: string;
  /** Value of fr_page_ref for this event ("" if absent). */
  pageRef: string;
  /** GA4 eventName. */
  eventName: string;
  /** GA4 "dateHourMinute" dim value, "YYYYMMDDHHMM" (12 digits; "" if absent). */
  dhm: string;
}

function dhmToEpochSeconds(dhm: string): number | null {
  if (dhm.length !== 12) return null;

  const year = Number(dhm.slice(0, 4));
  const month = Number(dhm.slice(4, 6));
  const day = Number(dhm.slice(6, 8));
  const hour = Number(dhm.slice(8, 10));
  const minute = Number(dhm.slice(10, 12));

  if ([year, month, day, hour, minute].some((n) => Number.isNaN(n))) return null;

  const ms = Date.UTC(year, month - 1, day, hour, minute);
  if (Number.isNaN(ms)) return null;

  return ms / 1000;
}

interface SessionAccumulator {
  refs: Set<string>;
  pageViews: number;
  minDhm: string;
  maxDhm: string;
  /** MIN date across the session's rows — its first-seen day. */
  date: string;
}

function sessionDurationSeconds(s: SessionAccumulator): number {
  if (s.minDhm === "" || s.maxDhm === "") return 0;
  const min = dhmToEpochSeconds(s.minDhm);
  const max = dhmToEpochSeconds(s.maxDhm);
  if (min === null || max === null) return 0;
  return Math.max(0, max - min);
}

function emptyCurrent(): KpiCurrent {
  return { sessions: 0, users: 0, pageViews: 0, bounceRate: 0, avgSessionDuration: 0 };
}

function summarise(sessions: SessionAccumulator[]): KpiCurrent {
  const count = sessions.length;
  if (count === 0) return emptyCurrent();

  let pageViews = 0;
  let bounced = 0;
  let durationSum = 0;

  for (const s of sessions) {
    pageViews += s.pageViews;
    if (s.pageViews <= 1) bounced += 1;
    durationSum += sessionDurationSeconds(s);
  }

  return {
    sessions: count,
    users: count,
    pageViews,
    bounceRate: bounced / count,
    avgSessionDuration: durationSum / count,
  };
}

export function aggregateSessions(rows: KpiSessionEventRow[], existing: Set<string>): { current: KpiCurrent; series: KpiSeriesPoint[] } {
  const bySession = new Map<string, SessionAccumulator>();

  for (const row of rows) {
    const acc = bySession.get(row.sessionId);

    if (acc) {
      acc.refs.add(row.pageRef);
      if (row.eventName === TRAFFIC_EVENTS.PAGE_VIEW) acc.pageViews += 1;
      if (row.dhm.length === 12) {
        if (acc.minDhm === "" || row.dhm < acc.minDhm) acc.minDhm = row.dhm;
        if (acc.maxDhm === "" || row.dhm > acc.maxDhm) acc.maxDhm = row.dhm;
      }
      if (row.date < acc.date) acc.date = row.date;
    } else {
      const validDhm = row.dhm.length === 12 ? row.dhm : "";
      bySession.set(row.sessionId, {
        refs: new Set([row.pageRef]),
        pageViews: row.eventName === TRAFFIC_EVENTS.PAGE_VIEW ? 1 : 0,
        minDhm: validDhm,
        maxDhm: validDhm,
        date: row.date,
      });
    }
  }

  const refsBySession = new Map<string, Set<string>>();
  for (const [sessionId, acc] of bySession) refsBySession.set(sessionId, acc.refs);

  const allowedIds = excludeDeletedSessions(refsBySession, existing);

  const allowed: SessionAccumulator[] = [];
  for (const [sessionId, acc] of bySession) {
    if (allowedIds.has(sessionId)) allowed.push(acc);
  }

  const current = summarise(allowed);

  const byDate = new Map<string, SessionAccumulator[]>();
  for (const acc of allowed) {
    const bucket = byDate.get(acc.date);
    if (bucket) bucket.push(acc);
    else byDate.set(acc.date, [acc]);
  }

  const series: KpiSeriesPoint[] = [...byDate.entries()]
    .map(([date, sessions]) => ({ date: isoFromGa4Date(date), ...summarise(sessions) }))
    .filter((p) => p.date !== "")
    .sort((a, b) => a.date.localeCompare(b.date));

  return { current, series };
}

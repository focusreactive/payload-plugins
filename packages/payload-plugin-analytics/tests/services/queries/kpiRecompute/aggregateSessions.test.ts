import { describe, expect, it } from "vitest";
import { aggregateSessions } from "../../../../src/services/queries/kpiRecompute/aggregateSessions";
import type { KpiSessionEventRow } from "../../../../src/services/queries/kpiRecompute/aggregateSessions";

const EXISTING = new Set(["page:1", "page:2", "__home"]);

function row(partial: Partial<KpiSessionEventRow> & { sessionId: string }): KpiSessionEventRow {
  return {
    date: "20260504",
    pageRef: "page:1",
    eventName: "page_view",
    dhm: "",
    ...partial,
  };
}

describe("aggregateSessions", () => {
  it("returns all-zero current + empty series for empty input", () => {
    const { current, series } = aggregateSessions([], EXISTING);
    expect(current).toEqual({ sessions: 0, users: 0, pageViews: 0, bounceRate: 0, avgSessionDuration: 0 });
    expect(series).toEqual([]);
  });

  it("excludes a session that touched a deleted ref from every metric + series", () => {
    const rows: KpiSessionEventRow[] = [
      // s1 — clean session (page:1 + __home), spans 14:30 → 14:32 = 120s
      row({ sessionId: "s1", pageRef: "page:1", eventName: "page_view", dhm: "202605041430" }),
      row({ sessionId: "s1", pageRef: "__home", eventName: "page_view", dhm: "202605041432" }),
      // s2 — touched a deleted ref → dropped whole
      row({ sessionId: "s2", pageRef: "page:999", eventName: "page_view", dhm: "202605041440" }),
    ];
    const { current, series } = aggregateSessions(rows, EXISTING);
    expect(current.sessions).toBe(1);
    // s2's duration + its pageview must not leak.
    expect(current.pageViews).toBe(2);
    expect(current.avgSessionDuration).toBe(120); // dhm span 14:30→14:32 over s1 only
    expect(series).toHaveLength(1);
    expect(series[0].sessions).toBe(1);
    expect(series[0].pageViews).toBe(2);
  });

  it("derives session duration as the dateHourMinute span (max−min minute) in seconds", () => {
    const rows: KpiSessionEventRow[] = [
      // s1 spans two minutes: 14:30 → 14:32 = 120s
      row({ sessionId: "s1", pageRef: "page:1", dhm: "202606171430" }),
      row({ sessionId: "s1", pageRef: "page:1", dhm: "202606171432" }),
    ];
    const { current } = aggregateSessions(rows, EXISTING);
    expect(current.avgSessionDuration).toBe(120);
  });

  it("treats a single-event (single-minute) session as zero duration", () => {
    const rows: KpiSessionEventRow[] = [row({ sessionId: "s1", pageRef: "page:1", dhm: "202606171430" })];
    const { current } = aggregateSessions(rows, EXISTING);
    expect(current.avgSessionDuration).toBe(0);
  });

  it("treats a session with missing/invalid dhm as zero duration", () => {
    const rows: KpiSessionEventRow[] = [row({ sessionId: "s1", pageRef: "page:1", dhm: "" }), row({ sessionId: "s1", pageRef: "page:1", dhm: "bad" })];
    const { current } = aggregateSessions(rows, EXISTING);
    expect(current.avgSessionDuration).toBe(0);
  });

  it("treats a single-pageview session as a bounce and a multi-pageview session as not a bounce", () => {
    const rows: KpiSessionEventRow[] = [
      // bounce: exactly one page_view
      row({ sessionId: "b", pageRef: "page:1", eventName: "page_view" }),
      // non-bounce: two page_views
      row({ sessionId: "nb", pageRef: "page:1", eventName: "page_view" }),
      row({ sessionId: "nb", pageRef: "page:2", eventName: "page_view" }),
    ];
    const { current } = aggregateSessions(rows, EXISTING);
    expect(current.sessions).toBe(2);
    expect(current.bounceRate).toBe(0.5);
  });

  it("counts only page_view events for pageViews (non-pageview events ignored)", () => {
    const rows: KpiSessionEventRow[] = [
      row({ sessionId: "s", pageRef: "page:1", eventName: "page_view" }),
      row({ sessionId: "s", pageRef: "page:1", eventName: "lead_action" }),
      row({ sessionId: "s", pageRef: "page:1", eventName: "scroll" }),
    ];
    const { current } = aggregateSessions(rows, EXISTING);
    expect(current.pageViews).toBe(1);
    // single pageview → bounce
    expect(current.bounceRate).toBe(1);
  });

  it("computes avgSessionDuration as the mean of per-session dhm spans (seconds)", () => {
    const rows: KpiSessionEventRow[] = [
      row({ sessionId: "s1", pageRef: "page:1", dhm: "202605041430" }),
      row({ sessionId: "s1", pageRef: "page:1", dhm: "202605041438" }), // s1 span = 8min = 480s
      row({ sessionId: "s2", pageRef: "page:2", dhm: "202605041400" }),
      row({ sessionId: "s2", pageRef: "page:2", dhm: "202605041404" }), // s2 span = 4min = 240s
    ];
    const { current } = aggregateSessions(rows, EXISTING);
    // mean(480, 240) = 360
    expect(current.avgSessionDuration).toBe(360);
  });

  it("reports users equal to sessions (documented approximation)", () => {
    const rows: KpiSessionEventRow[] = [row({ sessionId: "s1", pageRef: "page:1" }), row({ sessionId: "s2", pageRef: "page:2" })];
    const { current } = aggregateSessions(rows, EXISTING);
    expect(current.users).toBe(current.sessions);
    expect(current.users).toBe(2);
  });

  it("buckets allowed sessions per first-seen (min) date, sorted ascending", () => {
    const rows: KpiSessionEventRow[] = [
      // s1 first seen 0504, also has a later 0506 engagement row → assigned to 0504.
      // Single page_view → bounce. dhm span 14:30 → 14:32 (across days) = larger; assert below.
      row({ sessionId: "s1", date: "20260504", pageRef: "page:1", eventName: "page_view", dhm: "202605041430" }),
      row({ sessionId: "s1", date: "20260506", pageRef: "page:1", eventName: "scroll", dhm: "202605041432" }),
      // s2 on 0505 — two page_views → not a bounce.
      row({ sessionId: "s2", date: "20260505", pageRef: "page:2", eventName: "page_view" }),
      row({ sessionId: "s2", date: "20260505", pageRef: "page:2", eventName: "page_view" }),
    ];
    const { series } = aggregateSessions(rows, EXISTING);
    expect(series.map((p) => p.date)).toEqual(["2026-05-04", "2026-05-05"]);
    const day1 = series[0];
    expect(day1.sessions).toBe(1);
    expect(day1.pageViews).toBe(1);
    expect(day1.bounceRate).toBe(1); // single pageview → bounce
    expect(day1.avgSessionDuration).toBe(120); // dhm span 14:30 → 14:32 = 120s
    const day2 = series[1];
    expect(day2.sessions).toBe(1);
    expect(day2.pageViews).toBe(2);
    expect(day2.bounceRate).toBe(0); // 2 pageviews → not a bounce
    expect(day2.users).toBe(1);
  });

  it("drops a session whose only ref is empty (untracked hit)", () => {
    const rows: KpiSessionEventRow[] = [row({ sessionId: "s1", pageRef: "" }), row({ sessionId: "s2", pageRef: "page:1" })];
    const { current } = aggregateSessions(rows, EXISTING);
    expect(current.sessions).toBe(1);
  });
});

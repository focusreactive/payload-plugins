import { describe, expect, it, beforeEach } from "vitest";
import { kpisMock } from "../../../../src/services/analyticsService/mocks/kpis";
import { aggregateSessions } from "../../../../src/services/queries/kpiRecompute/aggregateSessions";
import type { KpiSessionEventRow } from "../../../../src/services/queries/kpiRecompute/aggregateSessions";
import {
  setActiveExistingRefs,
  __clearActiveExistingRefs,
} from "../../../../src/services/pageFilter/activeRefsHolder";
import { MOCK_MISSING_REF } from "../../../../src/services/analyticsService/mocks/mockRefs";

function decode(rows: Array<{ dimensionValues: Array<{ value: string }> }>): KpiSessionEventRow[] {
  return rows.map((r) => ({
    sessionId: r.dimensionValues[0].value,
    date: r.dimensionValues[1].value,
    pageRef: r.dimensionValues[2].value,
    eventName: r.dimensionValues[3].value,
    dhm: r.dimensionValues[4].value,
  }));
}

describe("kpisMock (session-level, recompute shape)", () => {
  beforeEach(() => {
    __clearActiveExistingRefs();
    setActiveExistingRefs(["pages:1"]);
  });

  it("emits 5-dimension session rows including a missing-ref session", () => {
    const res = kpisMock({ dateRanges: [{}] } as never) as {
      rows: Array<{ dimensionValues: Array<{ value: string }> }>;
    };
    expect(res.rows[0].dimensionValues).toHaveLength(5);
    expect(res.rows.some((r) => r.dimensionValues[2].value === MOCK_MISSING_REF)).toBe(true);
  });

  it("feeding the rows through aggregateSessions excludes the missing-ref session from totals", () => {
    const res = kpisMock({ dateRanges: [{}] } as never) as {
      rows: Array<{ dimensionValues: Array<{ value: string }> }>;
    };
    const { current } = aggregateSessions(decode(res.rows), new Set(["pages:1", "__home"]));
    // Missing session dropped → sessions count excludes it.
    const all = aggregateSessions(
      decode(res.rows),
      new Set(["pages:1", "__home", MOCK_MISSING_REF])
    );
    expect(current.sessions).toBeLessThan(all.current.sessions);
    expect(current.sessions).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from "vitest";
import { analyticsKeys } from "../../../../../src/components/AnalyticsView/hooks/queries/keys";

const q = { dateRange: { preset: "last-7d" as const }, comparison: { kind: "none" as const } };

describe("analyticsKeys", () => {
  it("all keys start with the 'analytics' root", () => {
    expect(analyticsKeys.all[0]).toBe("analytics");
    expect(analyticsKeys.kpis(q)[0]).toBe("analytics");
    expect(analyticsKeys.topPages({ ...q, limit: 10 })[0]).toBe("analytics");
    expect(analyticsKeys.topSources({ ...q, limit: 10 })[0]).toBe("analytics");
    expect(analyticsKeys.topEvents({ ...q, limit: 10 })[0]).toBe("analytics");
    expect(analyticsKeys.topDevices({ ...q, limit: 10 })[0]).toBe("analytics");
    expect(analyticsKeys.topCountries({ ...q, limit: 10 })[0]).toBe("analytics");
    expect(analyticsKeys.leadActions(q)[0]).toBe("analytics");
    expect(analyticsKeys.journeys({ ...q, limit: 20, maxSteps: 8 })[0]).toBe("analytics");
    expect(analyticsKeys.sessions({ ...q, limit: 50 })[0]).toBe("analytics");
    expect(analyticsKeys.sessionsOptions(q.dateRange)[0]).toBe("analytics");
    expect(analyticsKeys.sessionDetail("abc", { dateRange: q.dateRange })[0]).toBe("analytics");
  });

  it("encodes the resource name as the second segment", () => {
    expect(analyticsKeys.kpis(q)[1]).toBe("kpis");
    expect(analyticsKeys.topPages({ ...q, limit: 10 })[1]).toBe("topPages");
    expect(analyticsKeys.sessionsOptions(q.dateRange)[1]).toBe("sessionsOptions");
  });

  it("places the query object as the third segment for resource queries", () => {
    const key = analyticsKeys.kpis(q);
    expect(key[2]).toEqual(q);
  });

  it("sessionsOptions key depends only on dateRange (no comparison)", () => {
    const k1 = analyticsKeys.sessionsOptions({ preset: "last-7d" });
    const k2 = analyticsKeys.sessionsOptions({ preset: "last-7d" });
    expect(k1).toEqual(k2);
  });

  it("sessionDetail returns a disabled key when id is null", () => {
    const k = analyticsKeys.sessionDetail(null, { dateRange: q.dateRange });
    expect(k).toEqual(["analytics", "sessionDetail", "__disabled__"]);
  });

  it("sessionDetail returns an id-bearing key when id is provided", () => {
    const k = analyticsKeys.sessionDetail("sess-1", { dateRange: q.dateRange });
    expect(k[0]).toBe("analytics");
    expect(k[1]).toBe("sessionDetail");
    expect(k[2]).toBe("sess-1");
    expect(k[3]).toEqual({ dateRange: q.dateRange });
  });

  it("topCountries key includes the dimension field", () => {
    const k = analyticsKeys.topCountries({ ...q, limit: 10, dimension: "city" });
    expect(k[2]).toEqual({ ...q, limit: 10, dimension: "city" });
  });
});

import { describe, expect, it } from "vitest";
import { resolveComparison } from "../../../src/utils/date/resolveComparison";

describe("resolveComparison", () => {
  it("single day → previous day", () => {
    expect(resolveComparison({ startDate: "2026-05-10", endDate: "2026-05-10" })).toEqual({
      startDate: "2026-05-09", endDate: "2026-05-09",
    });
  });
  it("7-day window → preceding 7-day window, no overlap", () => {
    expect(resolveComparison({ startDate: "2026-05-04", endDate: "2026-05-10" })).toEqual({
      startDate: "2026-04-27", endDate: "2026-05-03",
    });
  });
  it("30-day window → preceding 30-day window", () => {
    expect(resolveComparison({ startDate: "2026-04-11", endDate: "2026-05-10" })).toEqual({
      startDate: "2026-03-12", endDate: "2026-04-10",
    });
  });
  it("(prev.endDate + 1 day) === current.startDate for arbitrary custom range", () => {
    const prev = resolveComparison({ startDate: "2025-06-01", endDate: "2025-06-15" });
    expect(prev).toEqual({ startDate: "2025-05-17", endDate: "2025-05-31" });
  });
  it("prev.length === current.length", () => {
    const current = { startDate: "2026-05-04", endDate: "2026-05-10" };
    const prev = resolveComparison(current);
    const lenC = (new Date(current.endDate).getTime() - new Date(current.startDate).getTime()) / 86_400_000;
    const lenP = (new Date(prev.endDate).getTime() - new Date(prev.startDate).getTime()) / 86_400_000;
    expect(lenP).toBe(lenC);
  });
});

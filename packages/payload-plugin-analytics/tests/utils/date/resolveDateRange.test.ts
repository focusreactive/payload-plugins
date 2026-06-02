import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveDateRange } from "../../../src/utils/date/resolveDateRange";

describe("resolveDateRange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("preset 'today' returns today/today", () => {
    expect(resolveDateRange({ preset: "today" })).toEqual({
      startDate: "2026-05-10",
      endDate: "2026-05-10",
    });
  });
  it("preset 'yesterday' returns yesterday/yesterday", () => {
    expect(resolveDateRange({ preset: "yesterday" })).toEqual({
      startDate: "2026-05-09",
      endDate: "2026-05-09",
    });
  });
  it("preset 'last-7d' returns 7-day window ending today", () => {
    expect(resolveDateRange({ preset: "last-7d" })).toEqual({
      startDate: "2026-05-04",
      endDate: "2026-05-10",
    });
  });
  it("preset 'last-14d' returns 14-day window ending today", () => {
    expect(resolveDateRange({ preset: "last-14d" })).toEqual({
      startDate: "2026-04-27",
      endDate: "2026-05-10",
    });
  });
  it("preset 'last-30d' returns 30-day window", () => {
    expect(resolveDateRange({ preset: "last-30d" })).toEqual({
      startDate: "2026-04-11",
      endDate: "2026-05-10",
    });
  });
  it("preset 'last-90d' returns 90-day window", () => {
    expect(resolveDateRange({ preset: "last-90d" })).toEqual({
      startDate: "2026-02-10",
      endDate: "2026-05-10",
    });
  });
  it("custom range passes through verbatim", () => {
    expect(resolveDateRange({ from: "2025-01-01", to: "2025-01-31" })).toEqual({
      startDate: "2025-01-01",
      endDate: "2025-01-31",
    });
  });
});

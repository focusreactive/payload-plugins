import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useResolvedDateRange } from "../../../../src/components/AnalyticsView/hooks/useResolvedDateRange";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-12T12:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("useResolvedDateRange", () => {
  it("today → same day for from/to", () => {
    const { result } = renderHook(() => useResolvedDateRange({ preset: "today" }));
    expect(result.current).toEqual({ from: "2026-05-12", to: "2026-05-12" });
  });

  it("yesterday → previous day for from/to", () => {
    const { result } = renderHook(() => useResolvedDateRange({ preset: "yesterday" }));
    expect(result.current).toEqual({ from: "2026-05-11", to: "2026-05-11" });
  });

  it("last-7d → 6 days back through today (inclusive)", () => {
    const { result } = renderHook(() => useResolvedDateRange({ preset: "last-7d" }));
    expect(result.current).toEqual({ from: "2026-05-06", to: "2026-05-12" });
  });

  it("last-14d → 13 days back through today", () => {
    const { result } = renderHook(() => useResolvedDateRange({ preset: "last-14d" }));
    expect(result.current).toEqual({ from: "2026-04-29", to: "2026-05-12" });
  });

  it("custom range passes through", () => {
    const { result } = renderHook(() =>
      useResolvedDateRange({ from: "2026-04-01", to: "2026-04-30" }),
    );
    expect(result.current).toEqual({ from: "2026-04-01", to: "2026-04-30" });
  });
});

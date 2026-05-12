import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAnalyticsParams } from "../../../../src/components/AnalyticsView/hooks/useAnalyticsParams";

const replaceMock = vi.fn();
const searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  useSearchParams: () => searchParams,
  usePathname: () => "/admin/analytics",
}));

beforeEach(() => {
  replaceMock.mockClear();
  for (const k of [...searchParams.keys()]) searchParams.delete(k);
});

describe("useAnalyticsParams", () => {
  it("defaults: tab=overview, range=last-14d, compare=none", () => {
    const { result } = renderHook(() => useAnalyticsParams());
    expect(result.current.tab).toBe("overview");
    expect(result.current.dateRange).toEqual({ preset: "last-14d" });
    expect(result.current.comparison).toEqual({ kind: "none" });
    expect(result.current.sessions).toEqual({});
  });

  it("parses ?tab=lead-actions", () => {
    searchParams.set("tab", "lead-actions");
    const { result } = renderHook(() => useAnalyticsParams());
    expect(result.current.tab).toBe("lead-actions");
  });

  it("falls back to overview on invalid tab", () => {
    searchParams.set("tab", "bogus");
    const { result } = renderHook(() => useAnalyticsParams());
    expect(result.current.tab).toBe("overview");
  });

  it("parses ?from/to as a custom range and ignores ?range", () => {
    searchParams.set("range", "last-7d");
    searchParams.set("from", "2026-04-01");
    searchParams.set("to", "2026-04-30");
    const { result } = renderHook(() => useAnalyticsParams());
    expect(result.current.dateRange).toEqual({ from: "2026-04-01", to: "2026-04-30" });
  });

  it("setTab calls router.replace with merged params", () => {
    const { result } = renderHook(() => useAnalyticsParams());
    act(() => result.current.setTab("sessions"));
    expect(replaceMock).toHaveBeenCalledWith(expect.stringContaining("tab=sessions"));
  });

  it("setDateRange to a preset clears from/to", () => {
    searchParams.set("from", "2026-04-01");
    searchParams.set("to", "2026-04-30");
    const { result } = renderHook(() => useAnalyticsParams());
    act(() => result.current.setDateRange({ preset: "last-30d" }));
    const arg = replaceMock.mock.calls[0]![0] as string;
    expect(arg).toContain("range=last-30d");
    expect(arg).not.toContain("from=");
    expect(arg).not.toContain("to=");
  });

  it("setSessions merges partial filters", () => {
    const { result } = renderHook(() => useAnalyticsParams());
    act(() => result.current.setSessions({ hadLeadAction: true, source: "google" }));
    const arg = replaceMock.mock.calls[0]![0] as string;
    expect(arg).toContain("hadLead=true");
    expect(arg).toContain("src=google");
  });

  it("parses session filters from URL when tab=sessions", () => {
    searchParams.set("tab", "sessions");
    searchParams.set("hadLead", "true");
    searchParams.set("src", "google");
    searchParams.set("dev", "mobile");
    searchParams.set("cnt", "DE");
    const { result } = renderHook(() => useAnalyticsParams());
    expect(result.current.sessions).toEqual({
      hadLeadAction: true,
      source: "google",
      device: "mobile",
      country: "DE",
    });
  });
});

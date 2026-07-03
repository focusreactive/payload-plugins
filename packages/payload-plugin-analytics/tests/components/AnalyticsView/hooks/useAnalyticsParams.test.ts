import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAnalyticsParams } from "../../../../src/components/AnalyticsView/hooks/useAnalyticsParams";

const { mockRouter, navState } = vi.hoisted(() => ({
  mockRouter: { push: vi.fn(), replace: vi.fn() },
  navState: { pathname: "/admin/analytics", search: "" },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navState.pathname,
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams(navState.search),
}));

function setUrl(search: string) {
  navState.search = search;
  window.history.replaceState(null, "", `${navState.pathname}${search ? `?${search}` : ""}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  setUrl("");
});

describe("useAnalyticsParams", () => {
  describe("param parsing", () => {
    it("defaults: tab=overview, range=last-14d, compare=none", () => {
      const { result } = renderHook(() => useAnalyticsParams());

      expect(result.current.tab).toBe("overview");
      expect(result.current.dateRange).toEqual({ preset: "last-14d" });
      expect(result.current.comparison).toEqual({ kind: "none" });
      expect(result.current.sessions).toEqual({});
    });

    it("parses ?tab=lead-actions", () => {
      setUrl("tab=lead-actions");
      const { result } = renderHook(() => useAnalyticsParams());

      expect(result.current.tab).toBe("lead-actions");
    });

    it("falls back to overview on invalid tab", () => {
      setUrl("tab=bogus");
      const { result } = renderHook(() => useAnalyticsParams());

      expect(result.current.tab).toBe("overview");
    });

    it("falls back to the last-14d preset on invalid range", () => {
      setUrl("range=bogus");
      const { result } = renderHook(() => useAnalyticsParams());

      expect(result.current.dateRange).toEqual({ preset: "last-14d" });
    });

    it("parses ?from/to as a custom range and ignores ?range", () => {
      setUrl("range=last-7d&from=2026-04-01&to=2026-04-30");
      const { result } = renderHook(() => useAnalyticsParams());

      expect(result.current.dateRange).toEqual({ from: "2026-04-01", to: "2026-04-30" });
    });

    it("ignores session filters outside the sessions tab", () => {
      setUrl("tab=overview&src=google&dev=mobile");
      const { result } = renderHook(() => useAnalyticsParams());

      expect(result.current.sessions).toEqual({});
    });

    it("parses session filters from URL when tab=sessions", () => {
      setUrl("tab=sessions&hadLead=true&src=google&dev=mobile&cnt=DE");
      const { result } = renderHook(() => useAnalyticsParams());

      expect(result.current.sessions).toEqual({
        hadLeadAction: true,
        source: "google",
        device: "mobile",
        country: "DE",
      });
    });
  });

  describe("setters write the URL shallowly", () => {
    it("setTab writes via history.replaceState and preserves other params", () => {
      setUrl("range=last-7d");
      const spy = vi.spyOn(window.history, "replaceState");
      const { result } = renderHook(() => useAnalyticsParams());

      act(() => result.current.setTab("sessions"));

      expect(spy).toHaveBeenCalledWith(null, "", "/admin/analytics?range=last-7d&tab=sessions");
    });

    it("never triggers a Next router navigation", () => {
      const { result } = renderHook(() => useAnalyticsParams());

      act(() => {
        result.current.setTab("ab");
        result.current.setDateRange({ preset: "last-30d" });
        result.current.setComparison({ kind: "previous-period" });
      });

      expect(mockRouter.replace).not.toHaveBeenCalled();
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it("keeps both params when two setters run in the same tick", () => {
      const { result } = renderHook(() => useAnalyticsParams());

      act(() => {
        result.current.setTab("sessions");
        result.current.setSessions({ source: "google" });
      });

      expect(window.location.search).toBe("?tab=sessions&src=google");
    });

    it("setDateRange to a preset clears from/to", () => {
      setUrl("from=2026-04-01&to=2026-04-30");
      const { result } = renderHook(() => useAnalyticsParams());

      act(() => result.current.setDateRange({ preset: "last-30d" }));

      expect(window.location.search).toBe("?range=last-30d");
    });

    it("setDateRange with custom dates clears the preset", () => {
      setUrl("range=last-7d");
      const { result } = renderHook(() => useAnalyticsParams());

      act(() => result.current.setDateRange({ from: "2026-06-01", to: "2026-06-30" }));

      expect(window.location.search).toBe("?from=2026-06-01&to=2026-06-30");
    });

    it("setSessions merges partial filters", () => {
      const { result } = renderHook(() => useAnalyticsParams());

      act(() => result.current.setSessions({ hadLeadAction: true, source: "google" }));

      expect(window.location.search).toBe("?hadLead=true&src=google");
    });

    it("setSelectedExperiment(null) removes the experiment param", () => {
      setUrl("tab=ab&experiment=exp-1");
      const { result } = renderHook(() => useAnalyticsParams());

      act(() => result.current.setSelectedExperiment(null));

      expect(window.location.search).toBe("?tab=ab");
    });
  });
});

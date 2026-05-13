import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSessionsOptionsQuery } from "../../../../../src/components/AnalyticsView/hooks/queries/useSessionsOptionsQuery";
import { createWrapper, jsonResponse } from "./test-utils";

afterEach(() => {
  vi.unstubAllGlobals();
});

const sessionsBody = {
  rows: [
    { sessionId: "s1", landingPage: "/", source: "google",  deviceCategory: "desktop", country: "US", startedAt: "2026-05-13T10:00:00.000Z", eventCount: 5, hadLeadAction: false },
    { sessionId: "s2", landingPage: "/", source: "direct",  deviceCategory: "desktop", country: "DE", startedAt: "2026-05-13T10:01:00.000Z", eventCount: 3, hadLeadAction: false },
    { sessionId: "s3", landingPage: "/", source: "google",  deviceCategory: "mobile",  country: "US", startedAt: "2026-05-13T10:02:00.000Z", eventCount: 2, hadLeadAction: false },
  ],
  pagination: { cursor: null, hasMore: false },
};

describe("useSessionsOptionsQuery", () => {
  it("sends limit=250 and comparison.kind='none' regardless of dateRange", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(sessionsBody));
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = createWrapper();
    renderHook(() => useSessionsOptionsQuery({ preset: "last-14d" }), { wrapper: Wrapper });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({
      dateRange: { preset: "last-14d" },
      comparison: { kind: "none" },
      limit: 250,
    });
  });

  it("projects rows into unique, sorted sources and countries", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(sessionsBody)));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSessionsOptionsQuery({ preset: "last-7d" }), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.sources).toEqual(["direct", "google"]);
    expect(result.current.data?.countries).toEqual(["DE", "US"]);
  });

  it("surfaces setupRequired when the server response sets it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ rows: [], pagination: { cursor: null, hasMore: false }, setupRequired: true })),
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSessionsOptionsQuery({ preset: "last-7d" }), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.setupRequired).toBe(true);
    expect(result.current.data?.sources).toEqual([]);
    expect(result.current.data?.countries).toEqual([]);
  });
});

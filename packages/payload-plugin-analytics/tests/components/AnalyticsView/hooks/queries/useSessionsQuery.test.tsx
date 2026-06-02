import { renderHook, waitFor, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSessionsQuery } from "../../../../../src/components/AnalyticsView/hooks/queries/useSessionsQuery";
import { createWrapper, jsonResponse } from "./test-utils";

afterEach(() => {
  vi.unstubAllGlobals();
});

const query = {
  dateRange: { preset: "last-7d" as const },
  comparison: { kind: "none" as const },
  limit: 50,
};

const page1 = {
  rows: [
    {
      sessionId: "s1",
      landingPage: "/",
      source: "google",
      deviceCategory: ["desktop"],
      country: ["US"],
      startedAt: "2026-05-13T10:00:00.000Z",
      eventCount: 5,
      hadLeadAction: false,
    },
  ],
  pagination: { cursor: "C2", hasMore: true },
};

const page2 = {
  rows: [
    {
      sessionId: "s2",
      landingPage: "/about",
      source: "direct",
      deviceCategory: ["mobile"],
      country: ["DE"],
      startedAt: "2026-05-13T11:00:00.000Z",
      eventCount: 3,
      hadLeadAction: true,
    },
  ],
  pagination: { cursor: null, hasMore: false },
};

describe("useSessionsQuery (infinite)", () => {
  it("threads cursor across pages and concatenates rows", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(page1)).mockResolvedValueOnce(jsonResponse(page2));
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSessionsQuery(query), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages).toHaveLength(1);
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.pages.length).toBe(2));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const body1 = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body1.cursor).toBeUndefined();
    const body2 = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body2.cursor).toBe("C2");

    const rows = result.current.data!.pages.flatMap((p) => p.rows);
    expect(rows.map((r) => r.sessionId)).toEqual(["s1", "s2"]);
    expect(result.current.hasNextPage).toBe(false);
  });
});

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSessionDetailQuery } from "../../../../../src/components/AnalyticsView/hooks/queries/useSessionDetailQuery";
import { createWrapper, jsonResponse } from "./test-utils";
import sessionDetail from "../../../../../__fixtures__/admin/sessionDetail.basic.json";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useSessionDetailQuery", () => {
  it("does not fetch when sessionId is null", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSessionDetailQuery(null, { preset: "last-7d" }), {
      wrapper: Wrapper,
    });
    // tick — give the hook a chance
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.isFetching).toBe(false);
  });

  it("fetches /api/analytics/sessions/<id> when an id is provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(sessionDetail));
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSessionDetailQuery("sess-1", { preset: "last-7d" }), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(sessionDetail);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/analytics/sessions/sess-1");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      dateRange: { preset: "last-7d" },
    });
  });
});

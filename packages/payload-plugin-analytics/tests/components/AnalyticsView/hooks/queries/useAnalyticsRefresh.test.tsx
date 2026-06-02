import { renderHook, waitFor, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAnalyticsRefresh } from "../../../../../src/components/AnalyticsView/hooks/queries/useAnalyticsRefresh";
import { useKpisQuery } from "../../../../../src/components/AnalyticsView/hooks/queries/useKpisQuery";
import { createWrapper, jsonResponse } from "./test-utils";
import kpisFixture from "../../../../../__fixtures__/admin/kpis.basic.json";

afterEach(() => {
  vi.unstubAllGlobals();
});

const query = { dateRange: { preset: "last-7d" as const }, comparison: { kind: "none" as const } };

describe("useAnalyticsRefresh", () => {
  it("starts with lastUpdatedAt=null when no analytics queries have run", () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAnalyticsRefresh(), { wrapper: Wrapper });
    expect(result.current.lastUpdatedAt).toBeNull();
    expect(result.current.isFetching).toBe(false);
  });

  it("reflects the latest dataUpdatedAt after a successful query", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(kpisFixture));
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = createWrapper();
    const { result: refresh } = renderHook(() => useAnalyticsRefresh(), { wrapper: Wrapper });
    const { result: kpis } = renderHook(() => useKpisQuery(query), { wrapper: Wrapper });
    await waitFor(() => expect(kpis.current.isSuccess).toBe(true));
    await waitFor(() => expect(refresh.current.lastUpdatedAt).not.toBeNull());
    expect(typeof refresh.current.lastUpdatedAt).toBe("number");
  });

  it("refresh() invalidates analytics queries and triggers a refetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(kpisFixture));
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = createWrapper();
    const { result: refresh } = renderHook(() => useAnalyticsRefresh(), { wrapper: Wrapper });
    const { result: kpis } = renderHook(() => useKpisQuery(query), { wrapper: Wrapper });
    await waitFor(() => expect(kpis.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await refresh.current.refresh();
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});

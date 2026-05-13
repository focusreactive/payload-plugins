import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useKpisQuery } from "../../../../../src/components/AnalyticsView/hooks/queries/useKpisQuery";
import { createTestQueryClient, createWrapper, jsonResponse } from "./test-utils";
import kpisFixture from "../../../../../__fixtures__/admin/kpis.basic.json";

afterEach(() => {
  vi.unstubAllGlobals();
});

const query = { dateRange: { preset: "last-7d" as const }, comparison: { kind: "none" as const } };

describe("useKpisQuery", () => {
  it("posts to /api/analytics/kpis with the query body and resolves data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(kpisFixture));
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useKpisQuery(query), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(kpisFixture);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/analytics/kpis");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(query);
  });

  it("retries twice on 500 then succeeds on the 3rd attempt (production defaults)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("oops", { status: 500, statusText: "Internal Server Error" }))
      .mockResolvedValueOnce(new Response("oops", { status: 500, statusText: "Internal Server Error" }))
      .mockResolvedValueOnce(jsonResponse(kpisFixture));
    vi.stubGlobal("fetch", fetchMock);
    const client = createTestQueryClient({ productionDefaults: true });
    const { Wrapper } = createWrapper(client);
    const { result } = renderHook(() => useKpisQuery(query), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 10_000 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  }, 15_000);

  it("does NOT retry on 403", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: "Forbidden" }, { status: 403, statusText: "Forbidden" }));
    vi.stubGlobal("fetch", fetchMock);
    const client = createTestQueryClient({ productionDefaults: true });
    const { Wrapper } = createWrapper(client);
    const { result } = renderHook(() => useKpisQuery(query), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((result.current.error as Error).message).toBe("Forbidden");
  });
});

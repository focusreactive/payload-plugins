import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTopPagesQuery } from "../../../../../src/components/AnalyticsView/hooks/queries/useTopPagesQuery";
import { createWrapper, jsonResponse } from "./test-utils";
import topPagesFixture from "../../../../../__fixtures__/admin/topPages.basic.json";

afterEach(() => {
  vi.unstubAllGlobals();
});

const query = {
  dateRange: { preset: "last-7d" as const },
  comparison: { kind: "none" as const },
  limit: 10,
};

describe("useTopPagesQuery", () => {
  it("posts to /api/analytics/top-pages with the query body and resolves data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(topPagesFixture));
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTopPagesQuery(query), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(topPagesFixture);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/analytics/top-pages");
    expect(JSON.parse(init.body)).toEqual(query);
  });
});

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useJourneysQuery } from "../../../../../src/components/AnalyticsView/hooks/queries/useJourneysQuery";
import { createWrapper, jsonResponse } from "./test-utils";
import journeys from "../../../../../__fixtures__/admin/journeys.basic.json";

afterEach(() => {
  vi.unstubAllGlobals();
});

const query = {
  dateRange: { preset: "last-7d" as const },
  comparison: { kind: "none" as const },
  limit: 20,
  maxSteps: 8,
};

describe("useJourneysQuery", () => {
  it("posts to /api/analytics/journeys with the query body and resolves data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(journeys));
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useJourneysQuery(query), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(journeys);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/analytics/journeys");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(query);
  });
});

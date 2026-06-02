import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLeadActionsQuery } from "../../../../../src/components/AnalyticsView/hooks/queries/useLeadActionsQuery";
import { createWrapper, jsonResponse } from "./test-utils";
import leadActions from "../../../../../__fixtures__/admin/leadActions.basic.json";

afterEach(() => {
  vi.unstubAllGlobals();
});

const query = { dateRange: { preset: "last-7d" as const }, comparison: { kind: "previous-period" as const } };

describe("useLeadActionsQuery", () => {
  it("posts to /api/analytics/lead-actions with the query body and resolves data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(leadActions));
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useLeadActionsQuery(query), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(leadActions);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/analytics/lead-actions");
  });
});

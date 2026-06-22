import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  useAbKpisQuery,
  useAbExperimentExposureQuery,
} from "../../../../../src/components/AnalyticsView/hooks/queries/useAbQueries";
import { createWrapper, jsonResponse } from "./test-utils";

afterEach(() => vi.unstubAllGlobals());

const query = { dateRange: { preset: "last-7d" as const } };

describe("useAbKpisQuery", () => {
  it("posts to /api/analytics/ab/kpis and resolves data", async () => {
    const payload = {
      activeExperiments: 2,
      variantsLive: 3,
      exposedSessions: 100,
      leadConversions: 10,
      avgAgeDays: 12,
      needingAttention: 0,
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload));
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAbKpisQuery(query), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(payload);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/analytics/ab/kpis");
  });
});

describe("useAbExperimentExposureQuery", () => {
  it("is disabled when manifestKey is null and does not fetch", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ buckets: [], srmPassed: true, srmPValue: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAbExperimentExposureQuery(null, query), {
      wrapper: Wrapper,
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts manifestKey + dateRange when enabled", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ buckets: [], srmPassed: true, srmPValue: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAbExperimentExposureQuery("/en/about", query), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/analytics/ab/experiment/exposure");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ manifestKey: "/en/about" });
  });
});

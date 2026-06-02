import { describe, expect, it, vi, beforeEach } from "vitest";
import * as mocksGate from "../../../src/services/analyticsService/mocksGate";
import { runQuery } from "../../../src/services/analyticsService/runQuery";
import { __setGa4ClientForTests } from "../../../src/services/ga4DataClient";
import { registerAnalyticsMocks, clearAnalyticsMocks } from "../../../src/services/analyticsService/mockRegistry";

describe("runQuery — pass-through", () => {
  beforeEach(() => clearAnalyticsMocks());

  it("runReport forwards request and prefixes property", async () => {
    const fake = {
      runReport: vi.fn().mockResolvedValue([{ rows: [] }]),
      batchRunReports: vi.fn(),
    };
    __setGa4ClientForTests(fake as never);

    await runQuery.runReport("12345", { dateRanges: [{ startDate: "2026-05-10", endDate: "2026-05-10" }] });
    expect(fake.runReport).toHaveBeenCalledWith(
      expect.objectContaining({
        property: "properties/12345",
        dateRanges: [{ startDate: "2026-05-10", endDate: "2026-05-10" }],
      })
    );
  });

  it("batchRunReports forwards requests and prefixes property", async () => {
    const fake = {
      runReport: vi.fn(),
      batchRunReports: vi.fn().mockResolvedValue([{ reports: [] }]),
    };
    __setGa4ClientForTests(fake as never);

    await runQuery.batchRunReports("12345", [{ dateRanges: [{ startDate: "2026-05-10", endDate: "2026-05-10" }] }]);
    expect(fake.batchRunReports).toHaveBeenCalledWith(
      expect.objectContaining({
        property: "properties/12345",
        requests: [{ dateRanges: [{ startDate: "2026-05-10", endDate: "2026-05-10" }] }],
      })
    );
  });
});

describe("runQuery — mock gate disabled", () => {
  beforeEach(() => {
    clearAnalyticsMocks();
    vi.spyOn(mocksGate, "isMockingEnabled").mockReturnValue(false);
  });

  it("runReport calls real client even when mockKey hits a registered mock", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([{ rows: [] }]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const mockFn = vi.fn();
    registerAnalyticsMocks({ runReport: { kpis: mockFn } });

    await runQuery.runReport("12345", { dateRanges: [] }, "kpis");
    expect(fake.runReport).toHaveBeenCalledTimes(1);
    expect(mockFn).not.toHaveBeenCalled();
  });

  it("batchRunReports calls real client even when mockKey hits a registered mock", async () => {
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockResolvedValue([{ reports: [] }]) };
    __setGa4ClientForTests(fake as never);
    const mockFn = vi.fn();
    registerAnalyticsMocks({ batchRunReports: { leadActions: mockFn } });

    await runQuery.batchRunReports("12345", [{ dateRanges: [] }], "leadActions");
    expect(fake.batchRunReports).toHaveBeenCalledTimes(1);
    expect(mockFn).not.toHaveBeenCalled();
  });
});

describe("runQuery — mock gate enabled", () => {
  beforeEach(() => {
    clearAnalyticsMocks();
    vi.spyOn(mocksGate, "isMockingEnabled").mockReturnValue(true);
  });

  it("runReport returns the registered mock when mockKey hits", async () => {
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const mockResponse = { rows: [{ dimensionValues: [{ value: "mocked" }] }] };
    registerAnalyticsMocks({ runReport: { kpis: () => mockResponse as never } });

    const result = await runQuery.runReport("12345", { dateRanges: [] }, "kpis");
    expect(result).toEqual(mockResponse);
    expect(fake.runReport).not.toHaveBeenCalled();
  });

  it("runReport falls through to real client when mockKey misses", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([{ rows: [] }]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);

    await runQuery.runReport("12345", { dateRanges: [] }, "doesNotExist");
    expect(fake.runReport).toHaveBeenCalledTimes(1);
  });

  it("runReport falls through to real client when no mockKey provided", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([{ rows: [] }]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    registerAnalyticsMocks({ runReport: { kpis: vi.fn() } });

    await runQuery.runReport("12345", { dateRanges: [] });
    expect(fake.runReport).toHaveBeenCalledTimes(1);
  });

  it("batchRunReports returns the registered mock when mockKey hits", async () => {
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const mockResponse = { reports: [{ rows: [] }] };
    registerAnalyticsMocks({ batchRunReports: { leadActions: () => mockResponse as never } });

    const result = await runQuery.batchRunReports("12345", [{ dateRanges: [] }], "leadActions");
    expect(result).toEqual(mockResponse);
    expect(fake.batchRunReports).not.toHaveBeenCalled();
  });

  it("batchRunReports falls through to real client when mockKey misses", async () => {
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockResolvedValue([{ reports: [] }]) };
    __setGa4ClientForTests(fake as never);

    await runQuery.batchRunReports("12345", [{ dateRanges: [] }], "doesNotExist");
    expect(fake.batchRunReports).toHaveBeenCalledTimes(1);
  });
});

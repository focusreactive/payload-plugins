import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  registerAnalyticsMocks,
  clearAnalyticsMocks,
  getRunReportMock,
  getBatchRunReportsMock,
} from "../../../src/services/analyticsService/mockRegistry";

describe("mockRegistry", () => {
  beforeEach(() => clearAnalyticsMocks());
  afterEach(() => clearAnalyticsMocks());

  it("registerAnalyticsMocks populates runReport entries", () => {
    const fn = () => ({ rows: [] });
    registerAnalyticsMocks({ runReport: { kpis: fn } });
    expect(getRunReportMock("kpis")).toBe(fn);
    expect(getRunReportMock("missing")).toBeUndefined();
  });

  it("registerAnalyticsMocks populates batchRunReports entries", () => {
    const fn = () => ({ reports: [] });
    registerAnalyticsMocks({ batchRunReports: { leadActions: fn } });
    expect(getBatchRunReportsMock("leadActions")).toBe(fn);
    expect(getBatchRunReportsMock("missing")).toBeUndefined();
  });

  it("clearAnalyticsMocks empties both maps", () => {
    registerAnalyticsMocks({
      runReport: { kpis: () => ({ rows: [] }) },
      batchRunReports: { leadActions: () => ({ reports: [] }) },
    });
    clearAnalyticsMocks();
    expect(getRunReportMock("kpis")).toBeUndefined();
    expect(getBatchRunReportsMock("leadActions")).toBeUndefined();
  });

  it("re-registering a key overwrites the previous entry", () => {
    const a = () => ({ rows: [{ dimensionValues: [{ value: "a" }] }] });
    const b = () => ({ rows: [{ dimensionValues: [{ value: "b" }] }] });
    registerAnalyticsMocks({ runReport: { kpis: a } });
    registerAnalyticsMocks({ runReport: { kpis: b } });
    expect(getRunReportMock("kpis")).toBe(b);
  });

  it("registerAnalyticsMocks tolerates an empty map without mutating state", () => {
    registerAnalyticsMocks({});
    expect(getRunReportMock("anything")).toBeUndefined();
    expect(getBatchRunReportsMock("anything")).toBeUndefined();
  });
});

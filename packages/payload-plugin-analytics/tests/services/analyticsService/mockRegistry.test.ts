import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  registerAnalyticsMocks,
  clearAnalyticsMocks,
  getRunReportMock,
  getBatchRunReportsMock,
} from "../../../src/services/analyticsService/mockRegistry";

const runReportStub = () => ({ rows: [] });
const batchRunReportsStub = () => ({ reports: [] });
const stubA = () => ({ rows: [{ dimensionValues: [{ value: "a" }] }] });
const stubB = () => ({ rows: [{ dimensionValues: [{ value: "b" }] }] });

describe("mockRegistry", () => {
  beforeEach(() => clearAnalyticsMocks());
  afterEach(() => clearAnalyticsMocks());

  it("registerAnalyticsMocks populates runReport entries", () => {
    registerAnalyticsMocks({ runReport: { kpis: runReportStub } });
    expect(getRunReportMock("kpis")).toBe(runReportStub);
    expect(getRunReportMock("missing")).toBeUndefined();
  });

  it("registerAnalyticsMocks populates batchRunReports entries", () => {
    registerAnalyticsMocks({ batchRunReports: { leadActions: batchRunReportsStub } });
    expect(getBatchRunReportsMock("leadActions")).toBe(batchRunReportsStub);
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
    registerAnalyticsMocks({ runReport: { kpis: stubA } });
    registerAnalyticsMocks({ runReport: { kpis: stubB } });
    expect(getRunReportMock("kpis")).toBe(stubB);
  });

  it("registerAnalyticsMocks tolerates an empty map without mutating state", () => {
    registerAnalyticsMocks({});
    expect(getRunReportMock("anything")).toBeUndefined();
    expect(getBatchRunReportsMock("anything")).toBeUndefined();
  });
});

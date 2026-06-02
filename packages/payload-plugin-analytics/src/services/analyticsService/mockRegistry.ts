import type { protos } from "@google-analytics/data";

type IRunReportRequest = protos.google.analytics.data.v1beta.IRunReportRequest;
type IRunReportResponse = protos.google.analytics.data.v1beta.IRunReportResponse;
type IBatchRunReportsResponse = protos.google.analytics.data.v1beta.IBatchRunReportsResponse;

export type RunReportMockFn = (request: IRunReportRequest) => IRunReportResponse | Promise<IRunReportResponse>;

export type BatchRunReportsMockFn = (requests: IRunReportRequest[]) => IBatchRunReportsResponse | Promise<IBatchRunReportsResponse>;

export interface AnalyticsMockMap {
  runReport?: Record<string, RunReportMockFn>;
  batchRunReports?: Record<string, BatchRunReportsMockFn>;
}

const runReportMocks = new Map<string, RunReportMockFn>();
const batchRunReportsMocks = new Map<string, BatchRunReportsMockFn>();

export function registerAnalyticsMocks(map: AnalyticsMockMap) {
  if (map.runReport) {
    for (const [key, fn] of Object.entries(map.runReport)) {
      runReportMocks.set(key, fn);
    }
  }
  if (map.batchRunReports) {
    for (const [key, fn] of Object.entries(map.batchRunReports)) {
      batchRunReportsMocks.set(key, fn);
    }
  }
}

export function clearAnalyticsMocks() {
  runReportMocks.clear();
  batchRunReportsMocks.clear();
}

export function getRunReportMock(key: string): RunReportMockFn | undefined {
  return runReportMocks.get(key);
}

export function getBatchRunReportsMock(key: string): BatchRunReportsMockFn | undefined {
  return batchRunReportsMocks.get(key);
}

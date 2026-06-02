import type { protos } from "@google-analytics/data";
import { getGa4Client } from "../ga4DataClient";
import { getRunReportMock, getBatchRunReportsMock } from "./mockRegistry";
import { isMockingEnabled } from "./mocksGate";

type IRunReportRequest = protos.google.analytics.data.v1beta.IRunReportRequest;
type IRunReportResponse = protos.google.analytics.data.v1beta.IRunReportResponse;
type IBatchRunReportsResponse = protos.google.analytics.data.v1beta.IBatchRunReportsResponse;

export const runQuery = {
  async runReport(propertyId: string, request: IRunReportRequest, mockKey?: string): Promise<IRunReportResponse> {
    if (isMockingEnabled() && mockKey) {
      const mock = getRunReportMock(mockKey);

      if (mock) return mock(request);
    }

    const client = getGa4Client();
    const [response] = await client.runReport({ ...request, property: `properties/${propertyId}` });

    if (!response) {
      throw new Error("GA4 SDK returned an empty runReport response tuple.");
    }

    return response;
  },
  async batchRunReports(propertyId: string, requests: IRunReportRequest[], mockKey?: string): Promise<IBatchRunReportsResponse> {
    if (isMockingEnabled() && mockKey) {
      const mock = getBatchRunReportsMock(mockKey);

      if (mock) return mock(requests);
    }

    const client = getGa4Client();
    const [response] = await client.batchRunReports({
      property: `properties/${propertyId}`,
      requests,
    });

    if (!response) {
      throw new Error("GA4 SDK returned an empty batchRunReports response tuple.");
    }

    return response;
  },
};

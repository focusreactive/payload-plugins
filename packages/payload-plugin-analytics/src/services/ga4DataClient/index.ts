import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { getPluginConfig } from "../../config";
import { buildAuth } from "./buildAuth";

declare global {
  var __payloadPluginAnalyticsGa4Client: BetaAnalyticsDataClient | null | undefined;
}

export function getGa4Client(): BetaAnalyticsDataClient {
  if (globalThis.__payloadPluginAnalyticsGa4Client) {
    return globalThis.__payloadPluginAnalyticsGa4Client;
  }

  const { ga4 } = getPluginConfig();

  globalThis.__payloadPluginAnalyticsGa4Client = new BetaAnalyticsDataClient({
    credentials: buildAuth(ga4.serviceAccount),
  });

  return globalThis.__payloadPluginAnalyticsGa4Client;
}

export function __setGa4ClientForTests(
  client: Pick<BetaAnalyticsDataClient, "runReport" | "batchRunReports">
) {
  globalThis.__payloadPluginAnalyticsGa4Client = client as BetaAnalyticsDataClient;
}

export function __resetGa4Client() {
  globalThis.__payloadPluginAnalyticsGa4Client = null;
}

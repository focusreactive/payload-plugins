import type { DateRange, ExperimentStats, VariantStats } from "../../types";
import {
  DATA_API_BASE,
  DEFAULT_CONVERSION_EVENT_NAME,
  DEFAULT_IMPRESSION_EVENT_NAME,
} from "./constants";
import type { GoogleAnalyticsAdapterConfig } from "./types";

interface GA4ReportRow {
  dimensionValues: { value: string }[];
  metricValues: { value: string }[];
}

interface GA4Report {
  rows?: GA4ReportRow[];
}

interface GA4BatchResponse {
  reports: GA4Report[];
}

function parseReport(report: GA4Report | undefined): Map<string, number> {
  const result = new Map<string, number>();

  if (!report) {return result;}

  for (const row of report.rows ?? []) {
    const bucket = row.dimensionValues[0]?.value;
    const raw = row.metricValues[0]?.value;

    if (bucket != null && raw != null) {
      result.set(bucket, Number.parseInt(raw, 10));
    }
  }

  return result;
}

export async function getExperimentStats(
  config: GoogleAnalyticsAdapterConfig,
  experimentId: string,
  dateRange: DateRange = { endDate: "today", startDate: "30daysAgo" }
): Promise<ExperimentStats> {
  if (!config.propertyId || !config.getAccessToken) {
    throw new Error(
      "payload-plugin-ab: getStats() requires propertyId and getAccessToken " +
        "to be set in GoogleAnalyticsAdapterConfig."
    );
  }

  const accessToken = await config.getAccessToken();
  const url = `${DATA_API_BASE}/${config.propertyId}:batchRunReports`;

  const makeReport = (eventName: string) => ({
    dateRanges: [dateRange],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            filter: {
              fieldName: "eventName",
              stringFilter: { matchType: "EXACT", value: eventName },
            },
          },
          {
            filter: {
              fieldName: "customEvent:experiment_id",
              stringFilter: { matchType: "EXACT", value: experimentId },
            },
          },
        ],
      },
    },
    dimensions: [{ name: "customEvent:variant_bucket" }],
    metrics: [{ name: "eventCount" }],
  });

  const res = await fetch(url, {
    body: JSON.stringify({
      requests: [
        makeReport(config.impressionEventName ?? DEFAULT_IMPRESSION_EVENT_NAME),
        makeReport(config.conversionEventName ?? DEFAULT_CONVERSION_EVENT_NAME),
      ],
    }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `payload-plugin-ab: GA4 Data API responded with ${res.status}: ${body}`
    );
  }

  const data: GA4BatchResponse = await res.json();

  const impressionMap = parseReport(data.reports[0]);
  const conversionMap = parseReport(data.reports[1]);

  const allBuckets = new Set([
    ...impressionMap.keys(),
    ...conversionMap.keys(),
  ]);

  const totalImpressions = [...impressionMap.values()].reduce(
    (acc, n) => acc + n,
    0
  );
  const totalConversions = [...conversionMap.values()].reduce(
    (acc, n) => acc + n,
    0
  );

  const variants: VariantStats[] = [...allBuckets].map((bucket) => {
    const impressions = impressionMap.get(bucket) ?? 0;
    const conversions = conversionMap.get(bucket) ?? 0;
    return {
      bucket,
      conversionRate: impressions > 0 ? conversions / impressions : 0,
      conversions,
      impressionShare:
        totalImpressions > 0 ? impressions / totalImpressions : 0,
      impressions,
    };
  });

  return {
    dateRange,
    experimentId,
    totals: {
      conversions: totalConversions,
      impressions: totalImpressions,
    },
    variants,
  };
}

import type { AbExperimentQuery, AbBucketCounts } from "../../types/ab";
import { getPluginConfig } from "../../config";
import { resolveAbConfig } from "../../config/resolveAbConfig";
import { resolveDateRange } from "../../utils/date/resolveDateRange";
import { dateRangesFor } from "../../utils/ga4";
import { runQuery } from "../analyticsService/runQuery";
import { AB_CONTROL_BUCKET } from "../../constants/ab";
import {
  aggregateBucketExposure,
  aggregateBucketConversions,
  experimentFilter,
  convertingFilter,
} from "../../utils/ga4/ab";
import { getAbExperimentRecordByKey } from "./getAbExperimentRecords";
import { getExperimentBucketMeta } from "./getExperimentBucketMeta";
import type { PayloadRequest } from "payload";

export interface AbExperimentStats {
  buckets: AbBucketCounts[];
  byBucketLead: Record<string, Record<string, number>>;
  startedAt: string | null;
}

export async function getAbExperimentStats(
  manifestKey: string,
  query: AbExperimentQuery | { dateRange: AbExperimentQuery["dateRange"] },
  req: PayloadRequest
): Promise<AbExperimentStats> {
  const pluginConfig = getPluginConfig();
  const ab = resolveAbConfig(pluginConfig.ab);
  if (!ab) throw new Error("A/B integration not configured");

  const dateRange = resolveDateRange(query.dateRange);
  const dateRanges = dateRangesFor(dateRange);
  const { dimensions } = ab;

  const exposureRequest = {
    dateRanges,
    metrics: [{ name: "eventCount" }],
    dimensions: [
      { name: `customEvent:${dimensions.variant}` },
      { name: "customEvent:fr_session_id" },
      { name: `customEvent:${dimensions.visitorId}` },
    ],
    dimensionFilter: experimentFilter(dimensions.experiment, manifestKey),
    limit: 250_000,
  };

  const convertingRequest = {
    dateRanges,
    metrics: [{ name: "eventCount" }],
    dimensions: [
      { name: `customEvent:${dimensions.variant}` },
      { name: "customEvent:fr_session_id" },
      { name: "customEvent:fr_lead_type" },
    ],
    dimensionFilter: convertingFilter(dimensions.experiment, manifestKey),
    limit: 250_000,
  };

  const batch = await runQuery.batchRunReports(
    pluginConfig.ga4.propertyId,
    [exposureRequest, convertingRequest] as never,
    "abExperimentStats"
  );
  const [exposureReport, convertingReport] = batch.reports ?? [];

  const exposure = aggregateBucketExposure((exposureReport?.rows ?? []) as never);
  const { byBucket: conversionsByBucket, byBucketLead } = aggregateBucketConversions(
    (convertingReport?.rows ?? []) as never
  );

  const record = await getAbExperimentRecordByKey(ab.experimentsCollectionSlug, manifestKey, req);
  const meta = record
    ? await getExperimentBucketMeta(
        record.parentCollection,
        record.parentDocId,
        record.locale ?? undefined,
        ab,
        req
      )
    : {};

  const allBuckets = new Set<string>([
    ...Object.keys(exposure),
    ...Object.keys(conversionsByBucket),
    ...Object.keys(meta),
  ]);

  const buckets: AbBucketCounts[] = [...allBuckets].map((bucket) => ({
    bucket,
    name: meta[bucket]?.name ?? null,
    visitors: exposure[bucket]?.visitors ?? 0,
    sessions: exposure[bucket]?.sessions ?? 0,
    convertingSessions: conversionsByBucket[bucket]?.convertingSessions ?? 0,
    rawConversions: conversionsByBucket[bucket]?.rawConversions ?? 0,
    configuredShare: meta[bucket]?.configuredShare ?? null,
  }));

  buckets.sort((a, b) => {
    if (a.bucket === AB_CONTROL_BUCKET) return -1;
    if (b.bucket === AB_CONTROL_BUCKET) return 1;

    return a.bucket.localeCompare(b.bucket);
  });

  return { buckets, byBucketLead, startedAt: record?.startedAt ?? null };
}

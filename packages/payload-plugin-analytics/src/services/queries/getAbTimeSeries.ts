import type { AbTimeSeriesResponse, AbTimeSeriesSeries, AbExperimentQuery } from "../../types/ab";
import { getPluginConfig } from "../../config";
import { resolveAbConfig } from "../../config/resolveAbConfig";
import { resolveDateRange } from "../../utils/date/resolveDateRange";
import { dateRangesFor } from "../../utils/ga4";
import { runQuery } from "../analyticsService/runQuery";
import { AB_CONTROL_BUCKET } from "../../constants/ab";
import { aggregateDailyByBucket, experimentFilter, convertingFilter } from "../../utils/ga4/ab";
import { twoProportionZTest } from "../abStatistics/twoProportionZTest";

export async function getAbTimeSeries(
  manifestKey: string,
  query: { dateRange: AbExperimentQuery["dateRange"] },
): Promise<AbTimeSeriesResponse> {
  const pluginConfig = getPluginConfig();
  const ab = resolveAbConfig(pluginConfig.ab);
  if (!ab) throw new Error("A/B integration not configured");

  const dateRanges = dateRangesFor(resolveDateRange(query.dateRange));
  const D = ab.dimensions;
  const dailyDims = [{ name: "date" }, { name: `customEvent:${D.variant}` }, { name: "customEvent:fr_session_id" }];

  const sessionsRequest = {
    dateRanges,
    metrics: [{ name: "eventCount" }],
    dimensions: dailyDims,
    dimensionFilter: experimentFilter(D.experiment, manifestKey),
    limit: 250_000,
  };

  const convertingRequest = {
    dateRanges,
    metrics: [{ name: "eventCount" }],
    dimensions: dailyDims,
    dimensionFilter: convertingFilter(D.experiment, manifestKey),
    limit: 250_000,
  };

  const batch = await runQuery.batchRunReports(
    pluginConfig.ga4.propertyId,
    [sessionsRequest, convertingRequest] as never,
    "abTimeSeries",
  );
  const [sessionsReport, convertingReport] = batch.reports ?? [];

  const dailySessions = aggregateDailyByBucket((sessionsReport?.rows ?? []) as never);
  const dailyConverting = aggregateDailyByBucket((convertingReport?.rows ?? []) as never);

  const buckets = new Set<string>([...Object.keys(dailySessions), ...Object.keys(dailyConverting)]);
  const allDates = new Set<string>();
  for (const b of buckets) {
    for (const d of Object.keys(dailySessions[b] ?? {})) allDates.add(d);
    for (const d of Object.keys(dailyConverting[b] ?? {})) allDates.add(d);
  }

  const dates = [...allDates].sort();

  const series: AbTimeSeriesSeries[] = [...buckets]
    .sort((a, b) =>
      a === AB_CONTROL_BUCKET ? -1
      : b === AB_CONTROL_BUCKET ? 1
      : a.localeCompare(b),
    )
    .map((bucket) => {
      let cumulativeSessions = 0;
      let cumulativeConvertingSessions = 0;
      const days = dates.map((date) => {
        cumulativeSessions += dailySessions[bucket]?.[date] ?? 0;
        cumulativeConvertingSessions += dailyConverting[bucket]?.[date] ?? 0;

        return { date, cumulativeSessions, cumulativeConvertingSessions };
      });

      return { bucket, name: null, days };
    });

  const control = series.find((s) => s.bucket === AB_CONTROL_BUCKET) ?? series[0];
  const significanceDates: Record<string, string | null> = {};

  for (const s of series) {
    if (!control || s.bucket === control.bucket) continue;

    let found: string | null = null;

    for (let i = 0; i < dates.length; i++) {
      const cd = control.days[i]!;
      const vd = s.days[i]!;

      if (vd.cumulativeSessions > 50 && cd.cumulativeSessions > 50) {
        const t = twoProportionZTest(
          vd.cumulativeConvertingSessions,
          vd.cumulativeSessions,
          cd.cumulativeConvertingSessions,
          cd.cumulativeSessions,
        );

        if (t.pValue < ab.stats.alpha) {
          found = vd.date;
          break;
        }
      }
    }

    significanceDates[s.bucket] = found;
  }

  return { series, significanceDates };
}

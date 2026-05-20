import type { DeviceCategory, Row, TopDevicesResponse, TopDevicesRow, TopNQuery } from "../../types/query";
import { resolveDateRange } from "../../utils/date/resolveDateRange";
import { resolveComparison } from "../../utils/date/resolveComparison";
import { bucketByDateRange, convertMetricToNumber, dateRangesFor, withRowLimit } from "../../utils/ga4";
import { runQuery } from "../analyticsService/runQuery";

const METRICS = [{ name: "sessions" }, { name: "totalUsers" }];

const KNOWN_DEVICE_CATEGORIES: ReadonlySet<DeviceCategory> = new Set(["desktop", "mobile", "tablet"]);

function normalizeDeviceCategory(value: string | null | undefined): DeviceCategory {
  if (value && (KNOWN_DEVICE_CATEGORIES as Set<string>).has(value)) return value as DeviceCategory;

  return "other";
}

function convertRowToTopDevicesRow(row: Row): TopDevicesRow {
  const dimensionValues = row.dimensionValues ?? [];
  const metricValues = row.metricValues ?? [];

  return {
    deviceCategory: normalizeDeviceCategory(dimensionValues[0]?.value),
    browser: dimensionValues[1]?.value ?? "",
    os: dimensionValues[2]?.value ?? "",
    sessions: convertMetricToNumber(metricValues[0]?.value),
    users: convertMetricToNumber(metricValues[1]?.value),
  };
}

function buildDeviceKey(row: TopDevicesRow): string {
  return `${row.deviceCategory}|${row.browser}|${row.os}`;
}

export async function getTopDevices(propertyId: string, query: TopNQuery): Promise<TopDevicesResponse> {
  const dateRange = resolveDateRange(query.dateRange);
  const previousDateRange = query.comparison?.kind === "previous-period" ? resolveComparison(dateRange) : undefined;
  const dateRanges = dateRangesFor(dateRange, previousDateRange);

  const dimensions =
    previousDateRange ?
      [{ name: "deviceCategory" }, { name: "browser" }, { name: "operatingSystem" }, { name: "dateRange" }]
    : [{ name: "deviceCategory" }, { name: "browser" }, { name: "operatingSystem" }];

  const request = withRowLimit({ dateRanges, metrics: METRICS, dimensions }, query.limit);
  const raw = await runQuery.runReport(propertyId, request as Parameters<typeof runQuery.runReport>[1], "topDevices");
  const rows = (raw.rows ?? []) as Row[];

  if (!previousDateRange) {
    return { rows: rows.map(convertRowToTopDevicesRow) };
  }

  const buckets = bucketByDateRange(rows, ["current", "previous"]);
  const currentRows = buckets.current.map(convertRowToTopDevicesRow);

  const previousRowsByKey = new Map<string, TopDevicesRow>();
  for (const row of buckets.previous.map(convertRowToTopDevicesRow)) {
    previousRowsByKey.set(buildDeviceKey(row), row);
  }

  const comparisonRows = currentRows
    .map((row) => previousRowsByKey.get(buildDeviceKey(row)))
    .filter((row): row is TopDevicesRow => Boolean(row));

  return {
    rows: currentRows,
    comparison: { rows: comparisonRows },
  };
}

import type { Access } from "payload";
import {
  DEFAULT_MAX_CHANGED_PATHS,
  DEFAULT_SLUG,
  LOG_PREFIX,
  MAX_RETENTION_DAYS,
} from "./constants";
import type { AuditLogPluginOptions, AuditRetentionOptions } from "./types";

export type ResolvedOptions = {
  slug: string;
  excludedCollections: ReadonlySet<string>;
  excludedGlobals: ReadonlySet<string>;
  retention?: AuditRetentionOptions;
  readAccess?: Access;
  recordIpAndUserAgent: boolean;
  maxChangedPaths: number;
};

const isPositiveInteger = (value: unknown): boolean =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

function assertPositiveInteger(name: string, value: unknown): void {
  if (!isPositiveInteger(value)) {
    throw new Error(`${LOG_PREFIX} ${name} must be a positive integer, got ${String(value)}`);
  }
}

function assertRetentionDays(days: unknown): void {
  assertPositiveInteger("retention.days", days);
  if ((days as number) > MAX_RETENTION_DAYS) {
    throw new Error(
      `${LOG_PREFIX} retention.days must be at most ${MAX_RETENTION_DAYS} (100 years), got ${String(days)}`
    );
  }
}

export function normalizeOptions(options: AuditLogPluginOptions = {}): ResolvedOptions {
  const slug = options.slug ?? DEFAULT_SLUG;
  if (options.retention) assertRetentionDays(options.retention.days);
  if (options.maxChangedPaths !== undefined) {
    assertPositiveInteger("maxChangedPaths", options.maxChangedPaths);
  }
  return {
    slug,
    excludedCollections: new Set([slug, ...(options.excludeCollections ?? [])]),
    excludedGlobals: new Set(options.excludeGlobals),
    retention: options.retention,
    readAccess: options.access?.read,
    recordIpAndUserAgent: options.recordIpAndUserAgent ?? true,
    maxChangedPaths: options.maxChangedPaths ?? DEFAULT_MAX_CHANGED_PATHS,
  };
}

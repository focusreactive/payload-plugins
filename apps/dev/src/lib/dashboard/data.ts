import type { CollectionSlug, PayloadRequest, SanitizedCollectionConfig } from "payload";

import { toWhere } from "./query";
import type { Condition } from "./query";

export const hasDrafts = (collection: SanitizedCollectionConfig): boolean =>
  Boolean(collection.versions?.drafts);

/** Collections worth showing on a dashboard: visible in the admin and not the users table. */
export const dashboardCollections = (req: PayloadRequest): SanitizedCollectionConfig[] =>
  req.payload.config.collections.filter(
    (collection) => collection.admin?.hidden !== true && !collection.auth
  );

export const findCollection = (
  req: PayloadRequest,
  slug: string | undefined
): SanitizedCollectionConfig | undefined =>
  req.payload.config.collections.find((collection) => collection.slug === slug);

export const collectionLabel = (collection: SanitizedCollectionConfig): string => {
  const { plural } = collection.labels;
  if (typeof plural === "string") {
    return plural;
  }
  if (plural && typeof plural === "object") {
    const [first] = Object.values(plural);
    if (typeof first === "string") {
      return first;
    }
  }
  return collection.slug;
};

/**
 * Count documents matching the conditions, as the current user may see them.
 *
 * A `_status` condition on a collection with drafts is answered from the latest version of
 * each document, so "draft" also catches published documents with unpublished changes — the
 * same thing the admin list view shows. Returns `null` when the count fails (e.g. a filter on
 * a field that does not exist) so one bad widget never breaks the dashboard.
 */
export const countDocuments = async (
  req: PayloadRequest,
  collection: SanitizedCollectionConfig,
  conditions: Condition[]
): Promise<number | null> => {
  const slug = collection.slug as CollectionSlug;
  const byLatestVersion =
    hasDrafts(collection) && conditions.some((condition) => condition.field === "_status");
  try {
    if (byLatestVersion) {
      const { totalDocs } = await req.payload.countVersions({
        collection: slug,
        overrideAccess: false,
        req,
        where: { and: [{ latest: { equals: true } }, toWhere(conditions, "version.")] },
      });
      return totalDocs;
    }
    const { totalDocs } = await req.payload.count({
      collection: slug,
      overrideAccess: false,
      req,
      where: toWhere(conditions),
    });
    return totalDocs;
  } catch {
    return null;
  }
};

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/** "3 hours ago" in the admin's language. */
export const relativeTime = (iso: string, now: Date, language: string): string => {
  const diff = new Date(iso).getTime() - now.getTime();
  const format = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
  for (const [unit, size] of UNITS) {
    if (Math.abs(diff) >= size) {
      return format.format(Math.round(diff / size), unit);
    }
  }
  return format.format(0, "minute");
};

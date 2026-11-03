import type { Payload, SelectType } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { FolderId } from "../types.js";
import { getFallbackLocaleKey, getLocaleCodes } from "./locales.js";
import { isPublishedInLocale } from "./pageRecords.js";
import { collectionHasDrafts } from "./publishedWhere.js";

const toText = (value: unknown): string => (typeof value === "string" ? value : "");

/**
 * The page's path in every locale it can be read in (spec section 8, hreflang): a locale appears
 * when the page has a path there and, for a published read, is live there (decision 24 counts a
 * locale served through the default locale's publish as live). `fullPath` and `status` are the
 * values of a read with `locale: "all"`. Empty when nothing is localized.
 */
export const livePathsByLocale = ({
  draft,
  fullPath,
  hasDrafts,
  payload,
  status,
}: {
  draft: boolean;
  fullPath: unknown;
  hasDrafts: boolean;
  payload: Payload;
  status: unknown;
}): Record<string, string> => {
  const codes = getLocaleCodes(payload.config);
  if (codes.length === 0 || !fullPath || typeof fullPath !== "object") {
    return {};
  }
  const fallbackKey = getFallbackLocaleKey(payload);
  const pathsByLocale = fullPath as Record<string, unknown>;
  const alternates: Record<string, string> = {};
  for (const code of codes) {
    const path = toText(pathsByLocale[code]);
    if (path !== "" && (draft || isPublishedInLocale(status, code, hasDrafts, fallbackKey))) {
      alternates[code] = path;
    }
  }

  return alternates;
};

/**
 * `alternates` of one page, one read: `{ en: '/blog/team', de: '/aktuelles/team' }`. It reads past
 * access control, because the caller already read the page and the paths are the page's own;
 * which locales appear still follows the published rule of the caller's read.
 */
export const readAlternates = async ({
  collection,
  draft,
  id,
  payload,
}: {
  collection: string;
  draft: boolean;
  id: FolderId;
  payload: Payload;
}): Promise<Record<string, string>> => {
  if (getLocaleCodes(payload.config).length === 0) {
    return {};
  }
  const hasDrafts = collectionHasDrafts(payload, collection);
  const doc = (await payload.findByID({
    collection: toCollectionSlug(collection),
    depth: 0,
    disableErrors: true,
    draft,
    id,
    locale: "all" as never,
    overrideAccess: true,
    select: { ...(hasDrafts ? { _status: true } : {}), fullPath: true } as SelectType,
  })) as { _status?: unknown; fullPath?: unknown } | null;
  if (!doc) {
    return {};
  }

  return livePathsByLocale({
    draft,
    fullPath: doc.fullPath,
    hasDrafts,
    payload,
    status: doc._status,
  });
};

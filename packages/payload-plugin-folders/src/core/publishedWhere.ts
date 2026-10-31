import type { Payload, Where } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import { getFallbackLocaleKey, getLocaleCodes } from "./locales.js";

/** Whether a collection keeps drafts, so its rows can be unpublished. */
export const collectionHasDrafts = (payload: Payload, collectionSlug: string): boolean =>
  Boolean(payload.collections[toCollectionSlug(collectionSlug)]?.config.versions?.drafts);

/** `_status` is stored per locale when a collection has drafts and localized fields. */
export const isStatusLocalized = (payload: Payload, collectionSlug: string): boolean =>
  Boolean(payload.config.localization) &&
  Boolean(
    payload.collections[toCollectionSlug(collectionSlug)]?.config.flattenedFields.some(
      (field) => field.name === "_status" && field.localized
    )
  );

/**
 * Where that matches the rows of a collection that are live in `locale` (spec section 10.1 step 4,
 * decision 24): the locale's own status is published, or it has no status of its own and the
 * fallback locale's is published, which is how a page that only the default locale published is
 * served in the others. Null for a collection without drafts, where every row is live. The paths are
 * locale qualified, so the clause holds whatever locale the query itself runs in.
 */
export const buildLiveInLocaleWhere = (
  payload: Payload,
  collectionSlug: string,
  locale: string | null
): Where | null => {
  if (!collectionHasDrafts(payload, collectionSlug)) {
    return null;
  }
  if (locale === null || !isStatusLocalized(payload, collectionSlug)) {
    return { _status: { equals: "published" } };
  }
  const own: Where = { [`_status.${locale}`]: { equals: "published" } };
  const fallbackKey = getFallbackLocaleKey(payload);
  if (fallbackKey === null || fallbackKey === locale) {
    return own;
  }

  return {
    or: [
      own,
      {
        and: [
          { [`_status.${locale}`]: { exists: false } },
          { [`_status.${fallbackKey}`]: { equals: "published" } },
        ],
      },
    ],
  };
};

/**
 * Where that matches the rows live in at least one locale: the filter for a read that then keeps
 * each locale on its own terms in memory (`paths`, `tree`).
 */
export const buildLiveAnywhereWhere = (payload: Payload, collectionSlug: string): Where | null => {
  if (!collectionHasDrafts(payload, collectionSlug)) {
    return null;
  }
  if (!isStatusLocalized(payload, collectionSlug)) {
    return { _status: { equals: "published" } };
  }

  return {
    or: getLocaleCodes(payload.config).map((code) => ({
      [`_status.${code}`]: { equals: "published" },
    })),
  };
};

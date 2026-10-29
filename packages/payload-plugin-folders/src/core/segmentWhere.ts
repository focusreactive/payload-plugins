import type { Where } from "payload";

export type SegmentWhereOptions = {
  /** The default locale of the Payload config (`config.localization.defaultLocale`). */
  defaultLocale: string;
  /** The locale the query runs in: the request's `locale`. */
  locale: string;
  /**
   * The segment to find, for example `post`, or several to find any of them in one query (a bulk
   * move checks all its segments at once; an `or` of one clause per segment would add a table join
   * for each).
   */
  segment: string | string[];
};

/**
 * Matches pages whose effective segment in `locale` is `segment`. `pathSegment` holds a page's own
 * segment only (build-lead decision 19), so outside the default locale a page also matches when it
 * has no segment of its own and the default locale's equals `segment`. Combine it with a
 * `folderPath` or `folder` condition and send the query with the same `locale`.
 *
 * The locale-qualified path `pathSegment.<defaultLocale>` is the one Payload resolves for a
 * localized field whatever the request's locale is.
 */
export const buildSegmentWhere = ({
  defaultLocale,
  locale,
  segment,
}: SegmentWhereOptions): Where => {
  const matches = (path: string): Where =>
    Array.isArray(segment) ? { [path]: { in: segment } } : { [path]: { equals: segment } };

  if (locale === defaultLocale) {
    return matches("pathSegment");
  }

  return {
    or: [
      matches("pathSegment"),
      {
        and: [{ pathSegment: { exists: false } }, matches(`pathSegment.${defaultLocale}`)],
      },
    ],
  };
};

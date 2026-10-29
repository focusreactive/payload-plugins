import type { Where } from "payload";

export type SegmentWhereOptions = {
  /** The default locale of the Payload config (`config.localization.defaultLocale`). */
  defaultLocale: string;
  /** The locale the query runs in: the request's `locale`. */
  locale: string;
  /** The segment to find, for example `post`. */
  segment: string;
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
  if (locale === defaultLocale) {
    return { pathSegment: { equals: segment } };
  }

  return {
    or: [
      { pathSegment: { equals: segment } },
      {
        and: [
          { pathSegment: { exists: false } },
          { [`pathSegment.${defaultLocale}`]: { equals: segment } },
        ],
      },
    ],
  };
};

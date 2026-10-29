import type { FieldHook } from "payload";

type ValuesByLocale = Record<string, unknown>;

const isValuesByLocale = (value: unknown): value is ValuesByLocale =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toSegment = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : null;

/**
 * `pathSegment[L]` is the page's own segment in locale `L`: its slug in that locale, or null when
 * it has none (build-lead decision 19). The locale fallback is applied when a query reads it, with
 * `buildSegmentWhere`, and when `fullPath` is composed. It is not stored, because a stored
 * fallback creates a locale row that breaks required localized fields and field defaults, and an
 * en publish rebuilds the published row from published locales only and would drop it.
 *
 * The hook runs on every create and every update, from the incoming slug merged over the stored
 * one, so a value a client sent for `pathSegment` never survives. It returns `null` rather than
 * `undefined` for a page without a segment, because a hook that returns `undefined` leaves the
 * client's value in place.
 */
export const buildPathSegmentHook =
  (segmentField: string, segmentLocalized: boolean): FieldHook =>
  ({ req, siblingData, siblingDocWithLocales }) => {
    const incoming: unknown = siblingData[segmentField];
    const stored: unknown = siblingDocWithLocales?.[segmentField];

    if (!(segmentLocalized && req.payload.config.localization)) {
      return toSegment(incoming !== undefined ? incoming : stored);
    }

    const { defaultLocale, localeCodes } = req.payload.config.localization;
    const storedSlugsByLocale = isValuesByLocale(stored) ? stored : {};

    if (req.locale === "all") {
      const merged = { ...storedSlugsByLocale, ...(isValuesByLocale(incoming) ? incoming : {}) };

      return Object.fromEntries(localeCodes.map((code) => [code, toSegment(merged[code])]));
    }

    const locale = req.locale || defaultLocale;

    return toSegment(incoming !== undefined ? incoming : storedSlugsByLocale[locale]);
  };

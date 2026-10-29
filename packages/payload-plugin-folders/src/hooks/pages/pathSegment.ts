import type { FieldHook } from "payload";

type ValuesByLocale = Record<string, unknown>;

const isValuesByLocale = (value: unknown): value is ValuesByLocale =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toSegment = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : null;

const pathSegmentFieldName = "pathSegment";

/**
 * Spec section 3.2: `pathSegment[L] = slug[L] || slug[defaultLocale]`. It is computed on every
 * create and every update, from the incoming slug merged over the stored one, so a value a client
 * sent for `pathSegment` never survives. It returns `null` rather than `undefined` for a page
 * without a segment, because a hook that returns `undefined` leaves the client's value in place.
 *
 * A field hook writes the request locale only. A save in the default locale also has to move every
 * locale that falls back to the default slug, and it does that here, in the same save, instead of
 * saving each of those locales again through the Local API (spec section 3.2): a second save of a
 * locale validates that locale's required localized fields, so one the editor never translated
 * would fail the editor's own save, and it would write a second version. Payload merges the
 * locales a save did not touch from `siblingDocWithLocales` when it builds the row to write, after
 * every hook has run, so the fallback locales are set there. That works because Payload reads the
 * object lazily; tests/int/segment-fallback.int.test.ts fails if a Payload upgrade stops doing so.
 * Nothing is written outside the save, so a draft save moves the draft's locales only.
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

      return Object.fromEntries(
        localeCodes.map((code) => [
          code,
          toSegment(merged[code]) ?? toSegment(merged[defaultLocale]),
        ])
      );
    }

    const locale = req.locale || defaultLocale;
    const own = toSegment(incoming !== undefined ? incoming : storedSlugsByLocale[locale]);
    const defaultSegment =
      locale === defaultLocale ? own : toSegment(storedSlugsByLocale[defaultLocale]);

    if (locale === defaultLocale && siblingDocWithLocales) {
      const storedSegments = siblingDocWithLocales[pathSegmentFieldName];
      const segmentsToMerge: ValuesByLocale = isValuesByLocale(storedSegments)
        ? { ...storedSegments }
        : {};
      for (const code of localeCodes) {
        if (code !== defaultLocale && toSegment(storedSlugsByLocale[code]) === null) {
          segmentsToMerge[code] = defaultSegment;
        }
      }
      siblingDocWithLocales[pathSegmentFieldName] = segmentsToMerge;
    }

    return own ?? defaultSegment;
  };

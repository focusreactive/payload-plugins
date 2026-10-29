import type { Payload, SanitizedConfig } from "payload";

import type { ResolvedOptions } from "../types.js";

/** The one slot a folder's values occupy when its fields are not localized. */
export const noLocaleKey = "-";

/** A value per locale code, or per `noLocaleKey` when nothing is localized. */
export type ValuesByLocale = Record<string, string | null | undefined>;

export const getLocaleCodes = (config: SanitizedConfig): string[] =>
  config.localization ? config.localization.localeCodes : [];

/** The slots folder values are stored in: every locale code, or the single `noLocaleKey`. */
export const getFolderLocaleKeys = (payload: Payload, options: ResolvedOptions): string[] => {
  const codes = getLocaleCodes(payload.config);

  return codes.length > 0 && options.localizeSegments ? codes : [noLocaleKey];
};

export const getDefaultLocaleKey = (payload: Payload, options: ResolvedOptions): string =>
  payload.config.localization && options.localizeSegments
    ? payload.config.localization.defaultLocale
    : noLocaleKey;

/** Spec section 3.2: a locale without its own segment uses the default locale's. */
export const effectiveSegment = (
  segments: ValuesByLocale,
  localeKey: string,
  defaultLocaleKey: string
): string => segments[localeKey] || segments[defaultLocaleKey] || "";

/**
 * The slot a request writes to: its locale, `all` for every slot at once, and the single slot when
 * folders are not localized.
 */
export const requestLocaleKey = (
  payload: Payload,
  options: ResolvedOptions,
  requestLocale: string | null | undefined
): "all" | string => {
  const keys = getFolderLocaleKeys(payload, options);
  if (keys.length === 1 && keys[0] === noLocaleKey) {
    return noLocaleKey;
  }
  if (requestLocale === "all") {
    return "all";
  }

  return requestLocale && keys.includes(requestLocale)
    ? requestLocale
    : getDefaultLocaleKey(payload, options);
};

/** Drops the locales a record has no value for, so a write never creates a locale row for them. */
export const withoutEmptyValues = (values: ValuesByLocale): Record<string, string> =>
  Object.fromEntries(
    Object.entries(values).filter((entry): entry is [string, string] => Boolean(entry[1]))
  );

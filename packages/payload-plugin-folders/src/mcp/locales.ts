import type { Config, SanitizedConfig } from "payload";

import { noLocaleKey } from "../core/locales.js";

export type McpLocales = {
  /** Every locale code of the site, or the single `noLocaleKey` when nothing is localized. */
  codes: string[];
  defaultLocale: string;
  /** False on a site without localization: its one key is `noLocaleKey`, as the core keys it. */
  isLocalized: boolean;
};

/**
 * The locale keys the tools take and give. A site without localization has one key, `-`, the slot
 * the core stores its values in, so the shape of every input and output is the same on every site.
 * Works on the raw config at plugin time and on the sanitized one at call time.
 */
export const describeLocales = (
  localization: Config["localization"] | SanitizedConfig["localization"]
): McpLocales => {
  if (!localization) {
    return { codes: [noLocaleKey], defaultLocale: noLocaleKey, isLocalized: false };
  }
  const codes = localization.locales.map((locale) =>
    typeof locale === "string" ? locale : locale.code
  );

  return { codes, defaultLocale: localization.defaultLocale, isLocalized: true };
};

/** The locale a core read takes for a key: `null` on a site without localization. */
export const toRequestLocale = (key: string): string | null => (key === noLocaleKey ? null : key);

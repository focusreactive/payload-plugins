import type { Config, SanitizedConfig } from "payload";

import { badRequest } from "../core/badRequest.js";
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

/** A language code as a person reads it ("de" is "German"); the code itself when the runtime has no name. */
export const languageName = (code: string): string => {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
};

/** One text per language from a tool argument; a language left out or empty is not in the answer. */
export const readLocaleValues = ({
  field,
  keys,
  value,
}: {
  field: string;
  keys: string[];
  value: unknown;
}): Record<string, string> => {
  if (value === undefined || value === null) {
    return {};
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw badRequest(
      `${field} must be an object with one text per language, for example { "${keys[0]}": "Guides" }.`
    );
  }
  const values: Record<string, string> = {};
  for (const [key, text] of Object.entries(value)) {
    if (!keys.includes(key)) {
      throw badRequest(
        `${field}: "${key}" is not a language of this site. The languages are ${keys.join(", ")}.`
      );
    }
    if (typeof text !== "string") {
      throw badRequest(`${field}.${key} must be text.`);
    }
    if (text.trim() !== "") {
      values[key] = text.trim();
    }
  }

  return values;
};

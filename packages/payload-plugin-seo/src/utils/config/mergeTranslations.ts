import type { Translations } from "../../translations/types";

export function mergeTranslations(base: Translations, extra: Translations): Translations {
  const out: Translations = { ...base };

  for (const [locale, strings] of Object.entries(extra)) {
    out[locale] = { ...(out[locale] ?? {}), ...strings };
  }

  return out;
}

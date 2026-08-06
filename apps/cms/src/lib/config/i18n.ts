import type { LocalePrefix, LocalePrefixMode } from "next-intl/routing";

import type { Locale } from "../types";

export const I18N_CONFIG: {
  // `label` names the language in English, for admin screens. `endonym` names it
  // in itself, which is what a reader of that language expects to click.
  locales: { code: Locale; label: string; endonym: string }[];
  defaultLocale: string;
  openGraphLocales: Record<string, string>;
  localePrefix: LocalePrefix<Locale[], LocalePrefixMode>;
} = {
  defaultLocale: "en",
  localePrefix: "as-needed",
  locales: [
    {
      code: "en",
      endonym: "English",
      label: "English",
    },
    {
      code: "es",
      endonym: "Español",
      label: "Spanish",
    },
    {
      code: "it",
      endonym: "Italiano",
      label: "Italian",
    },
  ],
  openGraphLocales: {
    en: "en_US",
    es: "es_ES",
    it: "it_IT",
  },
};

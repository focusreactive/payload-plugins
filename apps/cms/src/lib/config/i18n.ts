import type { LocalePrefix, LocalePrefixMode } from "next-intl/routing";

import type { Locale } from "../types";

export const I18N_CONFIG: {
  locales: { code: Locale; label: string }[];
  defaultLocale: string;
  openGraphLocales: Record<string, string>;
  localePrefix: LocalePrefix<Locale[], LocalePrefixMode>;
} = {
  defaultLocale: "en",
  localePrefix: "as-needed",
  locales: [
    {
      code: "en",
      label: "English",
    },
    {
      code: "es",
      label: "Spanish",
    },
    {
      code: "de",
      label: "Deutsch",
    },
    {
      code: "ja",
      label: "日本語",
    },
  ],
  openGraphLocales: {
    en: "en_US",
    es: "es_ES",
    de: "de_DE",
    ja: "ja_JP",
  },
};

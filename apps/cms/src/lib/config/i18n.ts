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
      code: "fr",
      label: "French",
    },
    {
      code: "ja",
      label: "Japanese",
    },
    {
      code: "ko",
      label: "Korean",
    },
    {
      code: "zh-hans",
      label: "Chinese (Simplified)",
    },
    {
      code: "zh-hant",
      label: "Chinese (Traditional)",
    },
  ],
  openGraphLocales: {
    en: "en_GB",
    fr: "fr_FR",
    ja: "ja_JP",
    ko: "ko_KR",
    "zh-hans": "zh_CN",
    "zh-hant": "zh_TW",
  },
};

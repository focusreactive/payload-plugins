import { defineRouting } from "next-intl/routing";

import { I18N_CONFIG } from "@/core/config/i18n";

import { localization } from "./localization";

export const routing = defineRouting({
  defaultLocale: localization.defaultLocale,
  localeCookie: false,
  localePrefix: I18N_CONFIG.localePrefix,
  locales: localization.locales as string[],
});

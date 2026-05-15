import type { LocalizationConfig } from "payload";

import { I18N_CONFIG } from "@/core/config/i18n";

export const localization: LocalizationConfig = {
  defaultLocale: I18N_CONFIG.defaultLocale,
  fallback: true,
  locales: I18N_CONFIG.locales.map((locale) => locale.code),
};

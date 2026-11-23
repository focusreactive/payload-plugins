import type { PayloadRequest } from "payload";

export type LocaleOfRequest = { locale?: unknown; fallbackLocale?: unknown };

type LocalizationShape = { localization?: false | { localeCodes?: readonly string[] } };

const ALL_LOCALES = "all";

const namesAFallback = (fallbackLocale: unknown): boolean =>
  Array.isArray(fallbackLocale) ? fallbackLocale.length > 0 : Boolean(fallbackLocale);

export const readsWithFallbackLocale = ({ locale, fallbackLocale }: LocaleOfRequest): boolean =>
  locale !== ALL_LOCALES && fallbackLocale !== locale && namesAFallback(fallbackLocale);

export const localeOfSave = ({ locale }: LocaleOfRequest, localized: boolean): string | undefined =>
  localized && typeof locale === "string" && locale !== ALL_LOCALES ? locale : undefined;

export const configuredLocalesOf = (req: PayloadRequest): readonly string[] => {
  const localization = (req.payload.config as LocalizationShape | undefined)?.localization;
  return localization ? (localization.localeCodes ?? []) : [];
};

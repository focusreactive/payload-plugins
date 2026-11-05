type LocaleOfRequest = { locale?: unknown; fallbackLocale?: unknown };

const ALL_LOCALES = "all";

const namesAFallback = (fallbackLocale: unknown): boolean =>
  Array.isArray(fallbackLocale) ? fallbackLocale.length > 0 : Boolean(fallbackLocale);

export const readsWithFallbackLocale = ({ locale, fallbackLocale }: LocaleOfRequest): boolean =>
  locale !== ALL_LOCALES && fallbackLocale !== locale && namesAFallback(fallbackLocale);

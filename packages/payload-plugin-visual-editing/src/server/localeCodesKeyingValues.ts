import type { Payload, PayloadRequest } from "payload";

const EVERY_LOCALE = "all";
const NO_LOCALES: readonly string[] = [];

export const localeCodesKeyingValues = (req: PayloadRequest): readonly string[] => {
  if (req.locale !== EVERY_LOCALE) return NO_LOCALES;
  const { localization } = req.payload.config;
  return localization ? localization.localeCodes : NO_LOCALES;
};

export const localeOf = (req: PayloadRequest): string | undefined =>
  typeof req.locale === "string" && req.locale !== EVERY_LOCALE ? req.locale : undefined;

export const isLocaleOf = (payload: Payload, locale: unknown): locale is string | undefined => {
  if (locale === undefined) return true;
  const { localization } = payload.config;
  return (
    typeof locale === "string" &&
    localization !== false &&
    localization.localeCodes.includes(locale)
  );
};

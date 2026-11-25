import type { CollectionSlug, PayloadRequest } from "payload";

import { getAutoTranslateConfig } from "../../../core/domain/auto-translate/index.js";
import { Locales } from "../../../core/domain/locales/index.js";
import type { LocaleCode } from "../../../types/wire/primitives.js";

export type ReadLocales = {
  source: LocaleCode;
  targets: LocaleCode[];
  configured: LocaleCode[];
};

/**
 * `null` where the host has no localization or names no source locale.
 */
export function readLocales(req: PayloadRequest, collection: CollectionSlug): ReadLocales | null {
  const localization = req.payload.config.localization;
  const known = Locales.knownCodes(localization);
  if (!localization || !known) return null;

  const registered = req.payload.config.collections.find((one) => one.slug === collection);
  const source = Locales.resolveSource({
    configured: getAutoTranslateConfig(registered ?? {})?.sourceLocale,
    localization,
  });
  if (source === undefined) return null;

  const configured = [...known];
  return { source, targets: configured.filter((locale) => locale !== source), configured };
}

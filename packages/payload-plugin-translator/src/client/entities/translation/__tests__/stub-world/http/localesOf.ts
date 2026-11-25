import type { PayloadRequest } from "payload";

import { Locales } from "../../../../../../core/domain/locales/index.js";
import type { WorldLocales } from "../model/index.js";

/** The host's own locales: the default one is the source, every other one a target. `null` without localization. */
export function localesOf(req: PayloadRequest): WorldLocales | null {
  const localization = req.payload.config.localization;
  const known = Locales.knownCodes(localization);
  if (!localization || !known) return null;

  const source = localization.defaultLocale;
  return { source, targets: [...known].filter((locale) => locale !== source) };
}

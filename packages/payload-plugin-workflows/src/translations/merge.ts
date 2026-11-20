import type { Config } from "payload";

import { en } from "./en.js";
import type { WorkflowsTranslationsOption } from "./en.js";

export const NAMESPACE = "workflows";

/**
 * The config's `i18n.translations` with the plugin's strings under `workflows`: English defaults
 * for every locale the host or the option names, the option's overrides on top.
 */
export const mergeTranslations = (
  incoming: Config["i18n"],
  overrides: WorkflowsTranslationsOption = {}
): NonNullable<Config["i18n"]>["translations"] => {
  const existing = (incoming?.translations ?? {}) as Record<string, Record<string, unknown>>;
  const locales = new Set(["en", ...Object.keys(existing), ...Object.keys(overrides)]);
  const merged: Record<string, Record<string, unknown>> = { ...existing };
  for (const locale of locales) {
    const current = existing[locale] ?? {};
    merged[locale] = {
      ...current,
      [NAMESPACE]: {
        ...en,
        ...((current[NAMESPACE] as object | undefined) ?? {}),
        ...overrides[locale],
      },
    };
  }
  return merged as NonNullable<Config["i18n"]>["translations"];
};

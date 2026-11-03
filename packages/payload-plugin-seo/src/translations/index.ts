import { cs } from "./messages/cs";
import { en } from "./messages/en";
import { normalizeMessageKey, TRANSLATION_NAMESPACE } from "./translate";
import type { Messages } from "./translate";
import type { Translations } from "./types";

/** Languages the plugin ships strings for. Any other falls back to English. */
export const BUNDLED_MESSAGES: Record<string, Messages> = { en, cs };

/** `i18n.translations` shape: `{ [language]: { seo: { [key]: string } } }`. */
export type NamespacedTranslations = Record<string, Record<string, Messages>>;

/**
 * The plugin's strings as Payload custom translations: the bundled languages,
 * with the `translations` option layered on top (and able to add languages).
 */
export function buildTranslations(overrides: Translations = {}): NamespacedTranslations {
  const out: NamespacedTranslations = {};

  for (const [language, messages] of Object.entries(BUNDLED_MESSAGES)) {
    out[language] = { [TRANSLATION_NAMESPACE]: { ...messages } };
  }

  for (const [language, strings] of Object.entries(overrides)) {
    const normalized = Object.fromEntries(
      Object.entries(strings).map(([key, value]) => [normalizeMessageKey(key), value])
    );
    out[language] = {
      [TRANSLATION_NAMESPACE]: { ...out[language]?.[TRANSLATION_NAMESPACE], ...normalized },
    };
  }

  return out;
}

export { createTranslator, TRANSLATION_NAMESPACE } from "./translate";
export type { Messages, Translate } from "./translate";
export type { Message, MessageVars, TranslationKey, Translations } from "./types";

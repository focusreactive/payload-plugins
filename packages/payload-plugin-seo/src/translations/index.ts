import { cs } from "./messages/cs";
import { en } from "./messages/en";
import { normalizeMessageKey, TRANSLATION_NAMESPACE } from "./translate";
import type { Messages } from "./translate";
import type { Translations } from "./types";

export const BUNDLED_MESSAGES: Record<string, Messages> = { en, cs };

export type NamespacedTranslations = Record<string, Record<string, Messages>>;

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

import type { RegisteredLanguage } from "./contract.js";
import { DuplicateLanguageError, UnknownLanguageError } from "./errors/index.js";

export type Registry = {
  get(languageId: string): RegisteredLanguage;
};

export function createRegistry(languages: readonly RegisteredLanguage[]): Registry {
  const byId = new Map<string, RegisteredLanguage>();
  for (const language of languages) {
    if (byId.has(language.id)) throw new DuplicateLanguageError(language.id);
    byId.set(language.id, language);
  }

  return {
    get(languageId) {
      const language = byId.get(languageId);
      if (language === undefined) {
        throw new UnknownLanguageError(languageId, [...byId.keys()]);
      }
      return language;
    },
  };
}

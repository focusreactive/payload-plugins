import { de } from "./de.js";
import { en } from "./en.js";

export type { FoldersTranslations } from "./en.js";

export const foldersTranslations = { de, en };

/** The keys the admin passes to its translate function, without the plural suffix. */
export type FoldersTranslationKey = keyof (typeof en)["foldersTree"] extends infer Key
  ? Key extends `${infer Base}_${"one" | "other"}`
    ? Base
    : Key
  : never;

type LanguageTranslations = Record<string, Record<string, unknown>>;

/**
 * The plugin's strings under the host's own, for every language the admin offers. English and
 * German are translated; any other supported language gets the English strings, so it never shows
 * a raw key. A host that sets `foldersTree` keys for a language keeps them, and every other
 * namespace of the host passes through untouched.
 */
export const mergeFoldersTranslations = (
  hostTranslations: Record<string, LanguageTranslations> | undefined,
  supportedLanguageCodes: readonly string[] = []
): Record<string, LanguageTranslations> => {
  const merged: Record<string, LanguageTranslations> = { ...hostTranslations };
  const languages = new Set([...Object.keys(foldersTranslations), ...supportedLanguageCodes]);
  for (const language of languages) {
    const pluginTranslations =
      foldersTranslations[language as keyof typeof foldersTranslations] ?? foldersTranslations.en;
    const hostLanguage: LanguageTranslations = hostTranslations?.[language] ?? {};
    merged[language] = {
      ...hostLanguage,
      foldersTree: { ...pluginTranslations.foldersTree, ...hostLanguage.foldersTree },
    };
  }

  return merged;
};

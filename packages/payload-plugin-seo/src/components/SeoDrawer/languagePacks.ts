"use client";

import { languageOf, registerResearcher } from "../../engine/researcherAdapter";

const loaded = new Set<string>(["en"]);

/**
 * Loads the Yoast language pack for `locale` and registers its Researcher, so
 * the next analysis of a paper in that language uses that language's
 * transition words, function words and stemmer instead of English ones.
 */
export async function ensureLanguagePack(locale: string, supported: string[]): Promise<void> {
  const lang = languageOf(locale);

  if (lang === "en" || loaded.has(lang) || !supported.includes(lang)) return;

  try {
    const mod = (await import(
      /* @vite-ignore */ `yoastseo/build/languageProcessing/languages/${lang}/Researcher`
    )) as { default?: unknown };

    // The pack is CommonJS compiled from ESM: bundlers hand over the class as
    // `default`, Node's ESM loader the whole `exports` object.
    const def = mod.default as { default?: unknown } | undefined;
    registerResearcher(lang, def?.default ?? def);

    loaded.add(lang);
  } catch {}
}

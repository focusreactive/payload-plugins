"use client";

import { languageCodeOf, registerResearcher } from "../../engine/researcherAdapter";

const loaded = new Set<string>(["en"]);

export async function ensureLanguagePack(locale: string, supported: string[]): Promise<void> {
  const lang = languageCodeOf(locale);

  if (lang === "en" || loaded.has(lang) || !supported.includes(lang)) return;

  try {
    const researcherModule: unknown = await import(
      /* @vite-ignore */ `yoastseo/build/languageProcessing/languages/${lang}/Researcher`
    );

    registerResearcher(lang, researcherModule);

    loaded.add(lang);
  } catch {}
}

"use client";

import { languageCodeOf, registerResearcher } from "../../engine/researcherAdapter";

const loaded = new Set<string>(["en"]);

function researcherClassOf(mod: { default?: unknown }): unknown {
  const exported = mod.default as { default?: unknown } | undefined;
  return exported?.default ?? exported;
}

export async function ensureLanguagePack(locale: string, supported: string[]): Promise<void> {
  const lang = languageCodeOf(locale);

  if (lang === "en" || loaded.has(lang) || !supported.includes(lang)) return;

  try {
    const mod = (await import(
      /* @vite-ignore */ `yoastseo/build/languageProcessing/languages/${lang}/Researcher`
    )) as { default?: unknown };

    registerResearcher(lang, researcherClassOf(mod));

    loaded.add(lang);
  } catch {}
}

"use client";

const loaded = new Set<string>(["en"]);

export async function ensureLanguagePack(locale: string, supported: string[]): Promise<void> {
  const lang = locale.split("_")[0] ?? "en";

  if (lang === "en" || loaded.has(lang) || !supported.includes(lang)) return;

  try {
    await import(/* @vite-ignore */ `yoastseo/build/languageProcessing/languages/${lang}/Researcher`);

    loaded.add(lang);
  } catch {}
}

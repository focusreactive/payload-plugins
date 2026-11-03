import EnglishResearcher from "yoastseo/build/languageProcessing/languages/en/Researcher";

export interface YoastResearcher {
  getResearch: (name: string) => unknown;
}

export type ResearcherConstructor = new (paper: unknown) => YoastResearcher;

const researchers = new Map<string, ResearcherConstructor>([
  ["en", EnglishResearcher as ResearcherConstructor],
]);

/** Language code of a Yoast locale: `cs_CZ` / `cs-CZ` / `cs` → `cs`. */
export function languageOf(locale: string | undefined): string {
  return (locale || "en").split(/[_-]/u)[0]?.toLowerCase() || "en";
}

/**
 * Make `lang`'s Yoast Researcher the one `makeResearcher` builds for papers in
 * that language. `ensureLanguagePack` calls this once the pack has loaded.
 */
export function registerResearcher(lang: string, Researcher: unknown): void {
  if (typeof Researcher === "function") researchers.set(lang, Researcher as ResearcherConstructor);
}

/**
 * The Researcher for the paper's language, falling back to English while that
 * language's pack is not loaded (or Yoast has none).
 */
export function makeResearcher(paper: unknown): YoastResearcher {
  const locale = (paper as { getLocale?: () => string } | null)?.getLocale?.();
  const Researcher =
    researchers.get(languageOf(locale)) ?? (EnglishResearcher as ResearcherConstructor);
  return new Researcher(paper);
}

export function getResearch<T = unknown>(researcher: YoastResearcher, name: string): T | undefined {
  try {
    return researcher.getResearch(name) as T;
  } catch {
    return undefined;
  }
}

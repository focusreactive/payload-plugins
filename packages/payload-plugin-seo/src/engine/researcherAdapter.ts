import EnglishResearcher from "yoastseo/build/languageProcessing/languages/en/Researcher";
import { commonJsDefault } from "./helpers/commonjs-default";

export interface YoastResearcher {
  getResearch: (name: string) => unknown;
}

export type ResearcherConstructor = new (paper: unknown) => YoastResearcher;

const fallbackEnglishResearcher: ResearcherConstructor = commonJsDefault(EnglishResearcher);

const researchersByLanguageCode = new Map<string, ResearcherConstructor>([
  ["en", fallbackEnglishResearcher],
]);

export function languageCodeOf(locale: string | undefined): string {
  return (locale || "en").split(/[_-]/u)[0]?.toLowerCase() || "en";
}

export function registerResearcher(lang: string, researcherModule: unknown): void {
  const Researcher = commonJsDefault(researcherModule);
  if (typeof Researcher === "function")
    researchersByLanguageCode.set(lang, Researcher as ResearcherConstructor);
}

export function makeResearcher(paper: unknown): YoastResearcher {
  const locale = (paper as { getLocale?: () => string } | null)?.getLocale?.();
  const Researcher =
    researchersByLanguageCode.get(languageCodeOf(locale)) ?? fallbackEnglishResearcher;
  return new Researcher(paper);
}

export function getResearch<T = unknown>(researcher: YoastResearcher, name: string): T | undefined {
  try {
    return researcher.getResearch(name) as T;
  } catch {
    return undefined;
  }
}

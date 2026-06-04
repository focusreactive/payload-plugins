import EnglishResearcher from "yoastseo/build/languageProcessing/languages/en/Researcher";

export interface YoastResearcher {
  getResearch: (name: string) => unknown;
}

export function makeResearcher(paper: unknown): YoastResearcher {
  return new EnglishResearcher(paper) as YoastResearcher;
}

export function getResearch<T = unknown>(researcher: YoastResearcher, name: string): T | undefined {
  try {
    return researcher.getResearch(name) as T;
  } catch {
    return undefined;
  }
}

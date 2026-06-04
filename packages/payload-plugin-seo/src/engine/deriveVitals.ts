import { getResearch } from './researcherAdapter';
import type { YoastResearcher } from './researcherAdapter';
import type { VitalsResult } from "./types";

export function deriveVitals(researcher: YoastResearcher, keyphrase: string): VitalsResult {
  const kp = new Set(keyphrase.toLowerCase().split(/\s+/u).filter(Boolean));
  const words = getResearch<number>(researcher, "wordCountInText") ?? 0;
  const sentences = (getResearch<unknown[]>(researcher, "countSentencesFromText") ?? []).length || (getResearch<number>(researcher, "countSentencesFromText") ?? 0);
  const paragraphs = (getResearch<unknown[]>(researcher, "getParagraphs") ?? []).length;
  const images = getResearch<number>(researcher, "imageCount") ?? 0;
  const videos = getResearch<number>(researcher, "videoCount") ?? 0;
  const readingTimeMinutes = getResearch<number>(researcher, "readingTime") ?? Math.max(1, Math.round(words / 200));

  const insights = getResearch<{ getWord?: () => string; getOccurrences?: () => number }[]>(researcher, "getProminentWordsForInsights") ?? [];
  const prominentWords = insights.slice(0, 5).map((w) => {
    const word = w.getWord?.() ?? String(w);
    return {
      word,
      count: w.getOccurrences?.() ?? 0,
      isKeyphrase: kp.has(word.toLowerCase()),
    };
  });

  const linking = getResearch<{ getWord?: () => string }[]>(researcher, "getProminentWordsForInternalLinking") ?? [];
  const internalLinkingPhrases = linking.slice(0, 5).map((w) => w.getWord?.() ?? String(w));

  return {
    words,
    sentences: typeof sentences === "number" ? sentences : 0,
    paragraphs,
    images,
    videos,
    readingTimeMinutes,
    prominentWords,
    internalLinkingPhrases,
  };
}

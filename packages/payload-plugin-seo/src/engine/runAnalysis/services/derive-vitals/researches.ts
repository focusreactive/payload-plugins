import { getResearch } from "../../../researcherAdapter";
import type { YoastResearcher } from "../../../researcherAdapter";
import type { ProminentWord } from "../../../types/analysis";

const WORDS_PER_MINUTE = 200;
const MAX_PROMINENT_WORDS = 5;

export function countWords(researcher: YoastResearcher): number {
  const raw = getResearch<number | { count?: number }>(researcher, "wordCountInText");

  return typeof raw === "number" ? raw : (raw?.count ?? 0);
}

export function countSentences(researcher: YoastResearcher): number {
  const fromArray = (getResearch<unknown[]>(researcher, "countSentencesFromText") ?? []).length;

  if (fromArray > 0) return fromArray;

  return getResearch<number>(researcher, "countSentencesFromText") ?? 0;
}

export function countParagraphs(researcher: YoastResearcher): number {
  return (getResearch<unknown[]>(researcher, "getParagraphs") ?? []).length;
}

export function countImages(researcher: YoastResearcher): number {
  return getResearch<number>(researcher, "imageCount") ?? 0;
}

export function countVideos(researcher: YoastResearcher): number {
  return getResearch<number>(researcher, "videoCount") ?? 0;
}

interface EstimateReadingTimeArgs {
  researcher: YoastResearcher;
  words: number;
}

export function estimateReadingTime({ researcher, words }: EstimateReadingTimeArgs): number {
  return (
    getResearch<number>(researcher, "readingTime") ??
    Math.max(1, Math.round(words / WORDS_PER_MINUTE))
  );
}

interface FindProminentWordsArgs {
  researcher: YoastResearcher;
  keyphrase: string;
}

export function findProminentWords({
  researcher,
  keyphrase,
}: FindProminentWordsArgs): ProminentWord[] {
  const keyphraseWords = new Set(keyphrase.toLowerCase().split(/\s+/u).filter(Boolean));

  const insights =
    getResearch<{ getWord?: () => string; getOccurrences?: () => number }[]>(
      researcher,
      "getProminentWordsForInsights"
    ) ?? [];

  return insights.slice(0, MAX_PROMINENT_WORDS).map((entry) => {
    const word = entry.getWord?.() ?? String(entry);

    return {
      word,
      count: entry.getOccurrences?.() ?? 0,
      isKeyphrase: keyphraseWords.has(word.toLowerCase()),
    };
  });
}

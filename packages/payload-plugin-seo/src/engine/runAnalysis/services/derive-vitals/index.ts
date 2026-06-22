import type { Paper } from "yoastseo";
import { makeResearcher } from "../../../researcherAdapter";
import type { VitalsResult } from "../../../types/analysis";
import { buildHeadingTree } from "./heading-tree";
import { extractHeadings } from "./headings";
import {
  countImages,
  countParagraphs,
  countSentences,
  countVideos,
  countWords,
  estimateReadingTime,
  findProminentWords,
} from "./researches";

export function deriveVitals(paper: InstanceType<typeof Paper>, keyphrase: string): VitalsResult {
  const researcher = makeResearcher(paper);
  const words = countWords(researcher);

  return {
    words,
    sentences: countSentences(researcher),
    paragraphs: countParagraphs(researcher),
    images: countImages(researcher),
    videos: countVideos(researcher),
    readingTimeMinutes: estimateReadingTime({ researcher, words }),
    prominentWords: findProminentWords({ researcher, keyphrase }),
    headings: buildHeadingTree(extractHeadings(researcher, paper)),
  };
}

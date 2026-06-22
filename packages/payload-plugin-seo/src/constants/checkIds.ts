export const CHECK_IDS = {
  keyphrase: [
    "introductionKeyword",
    "keyphraseLength",
    "keyphraseDensity",
    "metaDescriptionKeyword",
    "subheadingsKeyword",
    "textCompetingLinks",
    "imageKeyphrase",
    "keyphraseInSEOTitle",
    "slugKeyword",
    "functionWordsInKeyphrase",
    "keyphraseDistribution",
  ],
  onPage: [
    "textLength",
    "metaDescriptionLength",
    "titleWidth",
    "images",
    "externalLinks",
    "internalLinks",
    "singleH1",
  ],
  readability: [
    "subheadingsTooLong",
    "textParagraphTooLong",
    "textSentenceLength",
    "textTransitionWords",
    "passiveVoice",
    "sentenceBeginnings",
    "fleschReadingEase",
  ],
} as const;

export type CheckTab = keyof typeof CHECK_IDS;
export type CheckId = (typeof CHECK_IDS)[CheckTab][number];

import type { CheckId } from "../../../constants/checkIds";

export const LABELS: Record<CheckId, { name: string; tip: string }> = {
  introductionKeyword: {
    name: "Keyphrase in introduction",
    tip: "Whether the focus keyphrase appears in the first paragraph.",
  },
  keyphraseLength: {
    name: "Keyphrase length",
    tip: "Word count of the keyphrase itself.",
  },
  keyphraseDensity: {
    name: "Keyphrase density",
    tip: "Occurrences relative to total words. Ideal 0.5–2.5%.",
  },
  metaDescriptionKeyword: {
    name: "Keyphrase in meta description",
    tip: "Whether the keyphrase appears in the meta description.",
  },
  subheadingsKeyword: {
    name: "Keyphrase in subheadings",
    tip: "Whether subheadings (H2+) use the keyphrase.",
  },
  textCompetingLinks: {
    name: "Competing links",
    tip: "Links that use your keyphrase as anchor text.",
  },
  imageKeyphrase: {
    name: "Keyphrase in image alts",
    tip: "How many images reference the keyphrase in alt text.",
  },
  keyphraseInSEOTitle: {
    name: "Keyphrase in SEO title",
    tip: "Whether the keyphrase is in the SEO title, and where.",
  },
  slugKeyword: {
    name: "Keyphrase in slug",
    tip: "Whether the keyphrase appears in the URL slug.",
  },
  functionWordsInKeyphrase: {
    name: "Function words in keyphrase",
    tip: "Your keyphrase is made up only of function words.",
  },
  keyphraseDistribution: {
    name: "Keyphrase distribution",
    tip: "Where the keyphrase occurs across the document.",
  },
  textLength: {
    name: "Total word count",
    tip: "Total words vs the recommended minimum (300).",
  },
  metaDescriptionLength: {
    name: "Meta description length",
    tip: "Ideal 120–158 characters.",
  },
  titleWidth: {
    name: "SEO title width",
    tip: "Pixel width; over ~580px truncates.",
  },
  images: { name: "Images", tip: "Whether the text contains images." },
  externalLinks: {
    name: "Outbound links",
    tip: "Follow / nofollow mix of outbound links.",
  },
  internalLinks: {
    name: "Internal links",
    tip: "Follow / nofollow mix of internal links.",
  },
  singleH1: {
    name: "Exactly one H1",
    tip: "There is one H1, correctly positioned.",
  },
  subheadingsTooLong: {
    name: "Subheading distribution",
    tip: "Long sections without a subheading.",
  },
  textParagraphTooLong: {
    name: "Paragraph length",
    tip: "Paragraphs over the recommended length.",
  },
  textSentenceLength: {
    name: "Sentence length",
    tip: "Share of sentences over the recommended length.",
  },
  textTransitionWords: {
    name: "Transition words",
    tip: "Share of sentences using transition words.",
  },
  passiveVoice: {
    name: "Passive voice",
    tip: "Share of sentences in passive voice.",
  },
  sentenceBeginnings: {
    name: "Consecutive sentences",
    tip: "Repetitive sentence beginnings.",
  },
  fleschReadingEase: {
    name: "Reading ease",
    tip: "Flesch Reading Ease (0–100); higher is easier. Aim for 60+.",
  },
};

import type { Status } from "./types";

export interface RecoContext {
  keyphrase?: string;
  [k: string]: unknown;
}

type Builder = (ctx: RecoContext) => string;

const MAP: Record<string, Partial<Record<Status, Builder>>> = {
  introductionKeyword: {
    bad: (c) => `Add "${c.keyphrase ?? "your keyphrase"}" to your opening paragraph.`,
  },
  keyphraseDensity: {
    bad: () => `Use the keyphrase a few more times to land in the ideal band.`,
    warn: () => `Use the keyphrase ~2 more times to land in the ideal band.`,
  },
  metaDescriptionKeyword: {
    bad: () => `Add the keyphrase to the meta description to improve click-through.`,
  },
  imageKeyphrase: {
    warn: () => `Add the keyphrase to the alt text of the remaining images.`,
    bad: () => `Add the keyphrase to your image alt texts.`,
  },
  keyphraseDistribution: {
    warn: () => `Occurrences are clustered — spread the keyphrase through the body.`,
    bad: () => `Distribute the keyphrase more evenly through the text.`,
  },
  metaDescriptionLength: {
    warn: () => `You're near the limit — trim a few characters to avoid truncation.`,
    bad: () => `Adjust the meta description toward 120–158 characters.`,
  },
  internalLinks: {
    warn: () => `Add a few internal links to related pages.`,
    bad: () => `Add internal links to related pages.`,
  },
  textLength: {
    bad: () => `Add more content — aim for at least 300 words.`,
    warn: () => `Add more content to comfortably clear the minimum.`,
  },
};

const GENERIC: Record<Status, string> = {
  good: "",
  warn: "This check needs some attention.",
  bad: "This check needs improvement.",
};

export function getRecommendation(id: string, status: Status, ctx: RecoContext): string | undefined {
  if (status === "good") return undefined;

  const builder = MAP[id]?.[status];
  if (builder) return builder(ctx);

  return GENERIC[status];
}

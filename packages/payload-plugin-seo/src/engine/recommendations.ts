import type { Message, TranslationKey } from "../translations/types";
import type { Status } from "./types/analysis";

export interface RecoContext {
  keyphrase?: string;
  [k: string]: unknown;
}

type Builder = (ctx: RecoContext) => Message;

const key =
  (k: TranslationKey): Builder =>
  () => ({ key: k });

const MAP: Record<string, Partial<Record<Status, Builder>>> = {
  introductionKeyword: {
    bad: (c) =>
      c.keyphrase
        ? { key: "reco.introductionKeyword.bad", vars: { keyphrase: c.keyphrase } }
        : { key: "reco.introductionKeyword.badNoKeyphrase" },
  },
  keyphraseDensity: {
    bad: key("reco.keyphraseDensity.bad"),
    warn: key("reco.keyphraseDensity.warn"),
  },
  metaDescriptionKeyword: {
    bad: key("reco.metaDescriptionKeyword.bad"),
  },
  imageKeyphrase: {
    warn: key("reco.imageKeyphrase.warn"),
    bad: key("reco.imageKeyphrase.bad"),
  },
  keyphraseDistribution: {
    warn: key("reco.keyphraseDistribution.warn"),
    bad: key("reco.keyphraseDistribution.bad"),
  },
  metaDescriptionLength: {
    warn: key("reco.metaDescriptionLength.warn"),
    bad: key("reco.metaDescriptionLength.bad"),
  },
  internalLinks: {
    warn: key("reco.internalLinks.warn"),
    bad: key("reco.internalLinks.bad"),
  },
  textLength: {
    bad: key("reco.textLength.bad"),
    warn: key("reco.textLength.warn"),
  },
  fleschReadingEase: {
    warn: key("reco.fleschReadingEase.warn"),
    bad: key("reco.fleschReadingEase.bad"),
  },
};

const GENERIC: Record<Exclude<Status, "good">, TranslationKey> = {
  warn: "reco.generic.warn",
  bad: "reco.generic.bad",
};

export function getRecommendation(
  id: string,
  status: Status,
  ctx: RecoContext
): Message | undefined {
  if (status === "good") return undefined;

  const builder = MAP[id]?.[status];
  if (builder) return builder(ctx);

  return { key: GENERIC[status] };
}

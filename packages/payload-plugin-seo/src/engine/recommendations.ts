import { DEFAULT_SEO_THRESHOLDS } from "../constants";
import type { Message, TranslationKey } from "../translations/types";
import type { ResolvedSeoThresholds } from "../types/config";
import { thresholdVars } from "./thresholds/thresholdVars";
import type { Status } from "./types/analysis";
import { readNumber } from "../utils/readNumber";

export interface RecoContext {
  keyphrase?: string;
  thresholds?: ResolvedSeoThresholds;
}

type Builder = (ctx: RecoContext) => Message;

const key =
  (k: TranslationKey): Builder =>
  () => ({ key: k });

const withThresholds =
  (k: TranslationKey, checkId: string): Builder =>
  (c) => ({ key: k, vars: thresholdVars(checkId, c.thresholds ?? DEFAULT_SEO_THRESHOLDS) });

const MAP: Record<string, Partial<Record<Status, Builder>>> = {
  introductionKeyword: {
    bad: (c) =>
      c.keyphrase
        ? { key: "reco.introductionKeyword.bad", vars: { keyphrase: c.keyphrase } }
        : { key: "reco.introductionKeyword.badNoKeyphrase" },
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
    bad: withThresholds("reco.metaDescriptionLength.missing", "metaDescriptionLength"),
  },
  internalLinks: {
    warn: key("reco.internalLinks.warn"),
    bad: key("reco.internalLinks.bad"),
  },
  textLength: {
    bad: withThresholds("reco.textLength.bad", "textLength"),
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

type CheckData = Record<string, unknown> | undefined;

type DirectionKey = (
  data: CheckData,
  thresholds: ResolvedSeoThresholds
) => TranslationKey | undefined;

function densityKey(data: CheckData, { keyphraseDensity }: ResolvedSeoThresholds) {
  const count = readNumber(data, "count");
  const density = readNumber(data, "densityPct");
  const textLength = readNumber(data, "textLength");
  const minTextLength = readNumber(data, "minTextLength");
  if (
    count === undefined ||
    density === undefined ||
    textLength === undefined ||
    minTextLength === undefined
  ) {
    return undefined;
  }

  const tooMany =
    textLength < minTextLength ? count > 1 : count > 1 && density > keyphraseDensity.max;

  return tooMany ? "reco.keyphraseDensity.tooMany" : "reco.keyphraseDensity.tooFew";
}

function metaDescriptionLengthKey(
  data: CheckData,
  { metaDescriptionLength }: ResolvedSeoThresholds
) {
  const chars = readNumber(data, "chars");
  if (!chars) return undefined;
  if (chars <= metaDescriptionLength.min) return "reco.metaDescriptionLength.tooShort";
  if (chars > metaDescriptionLength.max) return "reco.metaDescriptionLength.tooLong";

  return undefined;
}

function titleWidthKey(data: CheckData, { titleWidth }: ResolvedSeoThresholds) {
  const px = readNumber(data, "px");

  return px !== undefined && px > titleWidth.max ? "reco.titleWidth.tooLong" : undefined;
}

const DIRECTION_KEYS: Record<string, DirectionKey> = {
  keyphraseDensity: densityKey,
  metaDescriptionLength: metaDescriptionLengthKey,
  titleWidth: titleWidthKey,
};

export function directionalRecommendation(
  id: string,
  status: Status,
  data: CheckData,
  thresholds: ResolvedSeoThresholds
): Message | undefined {
  if (status === "good") return undefined;

  const directionKey = DIRECTION_KEYS[id]?.(data, thresholds);

  return directionKey ? { key: directionKey, vars: thresholdVars(id, thresholds) } : undefined;
}

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

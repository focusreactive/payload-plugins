import {
  DEFAULT_SEO_THRESHOLDS,
  MAX_PERCENT,
  PLUGIN_NAME,
  SHORT_TITLE_WIDTH_PX,
} from "../../constants";
import type { ResolvedSeoThresholds, SeoThresholds } from "../../types/config";
import { isRecord } from "../isRecord";

type ThresholdCheck = keyof ResolvedSeoThresholds;

interface ThresholdRule<Field extends string> {
  ascending: readonly Field[];
  positive?: readonly Field[];
  percent?: readonly Field[];
  greaterThan?: number;
}

type ThresholdRules = {
  [Check in ThresholdCheck]: ThresholdRule<keyof ResolvedSeoThresholds[Check] & string>;
};

const RULES: ThresholdRules = {
  keyphraseLength: { ascending: ["max", "acceptableMax"], positive: ["max"] },
  keyphraseDensity: { ascending: ["min", "max"], percent: ["min", "max"] },
  metaDescriptionLength: { ascending: ["min", "max"] },
  titleWidth: { ascending: ["max"], greaterThan: SHORT_TITLE_WIDTH_PX },
  textLength: { ascending: ["acceptableMin", "min"], positive: ["acceptableMin"] },
  textSentenceLength: {
    ascending: ["max", "acceptableMax"],
    positive: ["maxSentenceWords"],
    percent: ["max", "acceptableMax"],
  },
  fleschReadingEase: {
    ascending: ["acceptableMin", "min"],
    percent: ["acceptableMin", "min"],
  },
};

const DEFAULTS: Readonly<Record<string, Readonly<Record<string, number>>>> = DEFAULT_SEO_THRESHOLDS;

function fail(message: string): never {
  throw new Error(`[${PLUGIN_NAME}] ${message}`);
}

function pathOf(...parts: string[]): string {
  return ["thresholds", ...parts].join(".");
}

function assertKnown(input: unknown): void {
  if (!isRecord(input)) fail(`${pathOf()} must be an object`);

  for (const [check, bands] of Object.entries(input)) {
    const defaults = DEFAULTS[check];
    if (!defaults) {
      fail(
        `${pathOf(check)} is not configurable. Configurable: ${Object.keys(DEFAULTS).join(", ")}`
      );
    }
    if (bands === undefined) continue;
    if (!isRecord(bands)) fail(`${pathOf(check)} must be an object`);

    for (const field of Object.keys(bands)) {
      if (!(field in defaults)) {
        fail(
          `${pathOf(check, field)} is not a known threshold. Known: ${Object.keys(defaults).join(", ")}`
        );
      }
    }
  }
}

function assertBands(check: string, bands: Record<string, unknown>, rule: ThresholdRule<string>) {
  for (const [field, value] of Object.entries(bands)) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      fail(`${pathOf(check, field)} must be a number of at least 0, got ${String(value)}`);
    }
    if (rule.positive?.includes(field) && value === 0) {
      fail(`${pathOf(check, field)} must be greater than 0`);
    }
    if (rule.percent?.includes(field) && value > MAX_PERCENT) {
      fail(`${pathOf(check, field)} must be at most ${MAX_PERCENT}`);
    }
    if (rule.greaterThan !== undefined && value <= rule.greaterThan) {
      fail(`${pathOf(check, field)} must be greater than ${rule.greaterThan}`);
    }
  }

  rule.ascending.slice(1).forEach((upper, index) => {
    const lower = rule.ascending[index] ?? upper;
    if (Number(bands[lower]) >= Number(bands[upper])) {
      fail(
        `${pathOf(check, lower)} (${String(bands[lower])}) must be lower than ${pathOf(check, upper)} (${String(bands[upper])})`
      );
    }
  });
}

function layered<Bands extends object>(
  defaults: Bands,
  under: Partial<Bands> | undefined,
  over: Partial<Bands> | undefined
): Bands {
  return { ...defaults, ...under, ...over };
}

export function mergeThresholds(
  under: SeoThresholds,
  over: SeoThresholds = {}
): ResolvedSeoThresholds {
  return {
    keyphraseLength: layered(
      DEFAULT_SEO_THRESHOLDS.keyphraseLength,
      under.keyphraseLength,
      over.keyphraseLength
    ),
    keyphraseDensity: layered(
      DEFAULT_SEO_THRESHOLDS.keyphraseDensity,
      under.keyphraseDensity,
      over.keyphraseDensity
    ),
    metaDescriptionLength: layered(
      DEFAULT_SEO_THRESHOLDS.metaDescriptionLength,
      under.metaDescriptionLength,
      over.metaDescriptionLength
    ),
    titleWidth: layered(DEFAULT_SEO_THRESHOLDS.titleWidth, under.titleWidth, over.titleWidth),
    textLength: layered(DEFAULT_SEO_THRESHOLDS.textLength, under.textLength, over.textLength),
    textSentenceLength: layered(
      DEFAULT_SEO_THRESHOLDS.textSentenceLength,
      under.textSentenceLength,
      over.textSentenceLength
    ),
    fleschReadingEase: layered(
      DEFAULT_SEO_THRESHOLDS.fleschReadingEase,
      under.fleschReadingEase,
      over.fleschReadingEase
    ),
  };
}

export function resolveThresholds(input: SeoThresholds = {}): ResolvedSeoThresholds {
  assertKnown(input);

  const resolved = mergeThresholds(input);

  for (const check of Object.keys(RULES) as ThresholdCheck[]) {
    assertBands(check, resolved[check], RULES[check]);
  }

  return resolved;
}

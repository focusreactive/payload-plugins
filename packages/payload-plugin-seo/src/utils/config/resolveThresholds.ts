import {
  DEFAULT_SEO_THRESHOLDS,
  MAX_PERCENT,
  PLUGIN_NAME,
  SHORT_TITLE_WIDTH_PX,
} from "../../constants";
import type { ResolvedSeoThresholds, SeoThresholds } from "../../types/config";
import {
  ASCENDING_BANDS,
  findUnorderedBands,
  mergeThresholds,
} from "../../engine/thresholds/mergeThresholds";
import type { ThresholdCheck, ThresholdField } from "../../engine/thresholds/mergeThresholds";
import { isRecord } from "../isRecord";

interface ThresholdRule<Field extends string> {
  positive?: readonly Field[];
  percent?: readonly Field[];
  greaterThan?: number;
}

type ThresholdRules = {
  [Check in ThresholdCheck]: ThresholdRule<ThresholdField<Check>>;
};

const RULES: ThresholdRules = {
  keyphraseLength: { positive: ["max"] },
  keyphraseDensity: { percent: ["min", "max"] },
  metaDescriptionLength: {},
  titleWidth: { greaterThan: SHORT_TITLE_WIDTH_PX },
  textLength: { positive: ["acceptableMin"] },
  textSentenceLength: {
    positive: ["maxSentenceWords"],
    percent: ["max", "acceptableMax"],
  },
  fleschReadingEase: { percent: ["acceptableMin", "min"] },
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

function assertBands(
  check: string,
  bands: Record<string, unknown>,
  rule: ThresholdRule<string>,
  order: readonly string[]
) {
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

  const unordered = findUnorderedBands(order, bands);
  if (unordered) {
    const { lower, upper } = unordered;
    fail(
      `${pathOf(check, lower)} (${String(bands[lower])}) must be lower than ${pathOf(check, upper)} (${String(bands[upper])})`
    );
  }
}

export function resolveThresholds(input: SeoThresholds = {}): ResolvedSeoThresholds {
  assertKnown(input);

  const resolved = mergeThresholds(input);

  for (const check of Object.keys(RULES) as ThresholdCheck[]) {
    assertBands(check, resolved[check], RULES[check], ASCENDING_BANDS[check]);
  }

  return resolved;
}

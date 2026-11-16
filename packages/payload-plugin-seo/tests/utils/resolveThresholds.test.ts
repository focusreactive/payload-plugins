import { describe, expect, it } from "vitest";
import { DEFAULT_SEO_THRESHOLDS } from "../../src/constants";
import type { SeoThresholds } from "../../src/types/config";
import { resolveThresholds } from "../../src/utils/config/resolveThresholds";

const resolving = (input: unknown) => () => resolveThresholds(input as SeoThresholds);

describe("resolveThresholds", () => {
  it("uses the Yoast defaults without configuration", () => {
    expect(resolveThresholds()).toEqual(DEFAULT_SEO_THRESHOLDS);
    expect(resolveThresholds({})).toEqual(DEFAULT_SEO_THRESHOLDS);
  });

  it("keeps the default for every number that is not configured", () => {
    const resolved = resolveThresholds({
      keyphraseDensity: { max: 2.5 },
      textLength: { min: 600 },
    });

    expect(resolved.keyphraseDensity).toEqual({ min: 0.5, max: 2.5 });
    expect(resolved.textLength).toEqual({ min: 600, acceptableMin: 250 });
    expect(resolved.metaDescriptionLength).toEqual(DEFAULT_SEO_THRESHOLDS.metaDescriptionLength);
  });

  it("rejects a check that cannot be configured", () => {
    expect(resolving({ passiveVoice: { max: 10 } })).toThrow(
      /thresholds\.passiveVoice is not configurable/u
    );
  });

  it("rejects an unknown number", () => {
    expect(resolving({ keyphraseDensity: { mn: 1 } })).toThrow(
      /thresholds\.keyphraseDensity\.mn is not a known threshold/u
    );
  });

  it("rejects a check that is not an object", () => {
    expect(resolving({ textLength: 300 })).toThrow(/thresholds\.textLength must be an object/u);
  });

  it.each([["300"], [-1], [Number.NaN], [Number.POSITIVE_INFINITY], [undefined]])(
    "rejects %s as a value",
    (value) => {
      expect(resolving({ textLength: { min: value } })).toThrow(
        /thresholds\.textLength\.min must be a number of at least 0/u
      );
    }
  );

  it.each<[string, SeoThresholds, RegExp]>([
    [
      "keyphraseLength",
      { keyphraseLength: { max: 8, acceptableMax: 8 } },
      /max \(8\) must be lower than .*acceptableMax \(8\)/u,
    ],
    [
      "keyphraseDensity",
      { keyphraseDensity: { min: 3.5 } },
      /min \(3\.5\) must be lower than .*max \(3\)/u,
    ],
    [
      "metaDescriptionLength",
      { metaDescriptionLength: { min: 160 } },
      /min \(160\) must be lower than .*max \(156\)/u,
    ],
    [
      "textLength",
      { textLength: { acceptableMin: 300 } },
      /acceptableMin \(300\) must be lower than .*min \(300\)/u,
    ],
    [
      "textSentenceLength",
      { textSentenceLength: { max: 40 } },
      /max \(40\) must be lower than .*acceptableMax \(30\)/u,
    ],
    [
      "fleschReadingEase",
      { fleschReadingEase: { acceptableMin: 70 } },
      /acceptableMin \(70\) must be lower than .*min \(60\)/u,
    ],
  ])("rejects %s bands in the wrong order", (_check, input, message) => {
    expect(resolving(input)).toThrow(message);
  });

  it.each<[SeoThresholds, RegExp]>([
    [{ keyphraseDensity: { max: 120 } }, /thresholds\.keyphraseDensity\.max must be at most 100/u],
    [
      { textSentenceLength: { acceptableMax: 101 } },
      /thresholds\.textSentenceLength\.acceptableMax must be at most 100/u,
    ],
    [
      { fleschReadingEase: { min: 120 } },
      /thresholds\.fleschReadingEase\.min must be at most 100/u,
    ],
  ])("rejects a percentage or score over 100", (input, message) => {
    expect(resolving(input)).toThrow(message);
  });

  it.each<[SeoThresholds, string]>([
    [{ keyphraseLength: { max: 0 } }, "keyphraseLength.max"],
    [{ textLength: { acceptableMin: 0 } }, "textLength.acceptableMin"],
    [{ textSentenceLength: { maxSentenceWords: 0 } }, "textSentenceLength.maxSentenceWords"],
  ])("rejects 0 where it has no meaning", (input, field) => {
    expect(resolving(input)).toThrow(`thresholds.${field} must be greater than 0`);
  });

  it("rejects a title width the fixed short-title band already covers", () => {
    expect(resolving({ titleWidth: { max: 400 } })).toThrow(
      /thresholds\.titleWidth\.max must be greater than 400/u
    );
  });

  it("names the plugin in the error", () => {
    expect(resolving({ textLength: { min: -1 } })).toThrow(/^\[payload-plugin-seo\]/u);
  });
});

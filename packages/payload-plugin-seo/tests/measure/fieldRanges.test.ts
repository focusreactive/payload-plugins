import { describe, expect, it } from "vitest";
import { DEFAULT_SEO_THRESHOLDS } from "../../src/constants";
import { fieldRangeOf, fieldRangesFor } from "../../src/measure/fieldRanges";
import { resolveThresholds } from "../../src/utils/config/resolveThresholds";

describe("fieldRangesFor", () => {
  it("matches the drawer defaults", () => {
    expect(fieldRangesFor(DEFAULT_SEO_THRESHOLDS)).toEqual({
      title: { min: 400, max: 600 },
      description: { min: 120, max: 156 },
    });
  });

  it("follows the configured thresholds", () => {
    const thresholds = resolveThresholds({
      titleWidth: { max: 650 },
      metaDescriptionLength: { min: 100, max: 140 },
    });

    expect(fieldRangesFor(thresholds)).toEqual({
      title: { min: 400, max: 650 },
      description: { min: 100, max: 140 },
    });
  });
});

describe("fieldRangeOf", () => {
  it("lets the field's own numbers win and fills the rest", () => {
    expect(fieldRangeOf({ min: 100, max: 140 }, { max: 150 })).toEqual({ min: 100, max: 150 });
    expect(fieldRangeOf({ min: 100, max: 140 }, undefined)).toEqual({ min: 100, max: 140 });
  });
});

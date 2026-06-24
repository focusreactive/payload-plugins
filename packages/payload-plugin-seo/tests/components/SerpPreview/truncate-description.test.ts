import { describe, expect, it } from "vitest";

import {
  SERP_DESCRIPTION_MAX,
  truncateDescription,
} from "../../../src/components/SeoDrawer/components/SerpPreview/truncate-description";

const OMISSION = " …"; // " …"

describe("SERP_DESCRIPTION_MAX", () => {
  it("is exactly 156", () => {
    expect(SERP_DESCRIPTION_MAX).toBe(156);
  });
});

describe("truncateDescription", () => {
  it("returns a string <= 156 chars unchanged", () => {
    const text = "a".repeat(156);
    expect(truncateDescription(text)).toBe(text);
  });

  it("returns a string shorter than 156 chars unchanged", () => {
    const text = "Short description.";
    expect(truncateDescription(text)).toBe(text);
  });

  it("returns a string of exactly 156 chars unchanged", () => {
    const text = "x".repeat(156);
    expect(truncateDescription(text)).toBe(text);
  });

  it("truncates a string longer than 156 chars so that result.length <= 156", () => {
    const text = "word ".repeat(40); // 200 chars
    const result = truncateDescription(text);
    expect(result.length).toBeLessThanOrEqual(156);
  });

  it("ends with the omission string ' …' when truncated", () => {
    const text = "word ".repeat(40);
    const result = truncateDescription(text);
    expect(result.endsWith(OMISSION)).toBe(true);
  });

  it("does not split on a word boundary mid-word", () => {
    // build a string where the 154-char boundary falls inside a long word
    // "aaa...aaa " (100 chars of 'a' + space) + "bbb...bbb" (100 chars of 'b')
    // budget = 156 - 2 = 154, so candidate = first 154 chars
    // that puts us 54 chars into the 'b'-word — no space found after position 100
    const prefix = "a".repeat(100) + " ";
    const longWord = "b".repeat(100);
    const text = prefix + longWord;
    const result = truncateDescription(text);
    // The cut must end at the 'a' word, not mid-way through 'b'-word
    // so the part before omission should end with 'aaa...a'
    const beforeOmission = result.slice(0, result.length - OMISSION.length);
    expect(/b/.test(beforeOmission)).toBe(false);
    expect(result.length).toBeLessThanOrEqual(156);
  });

  it("budget boundary lands mid-word: cuts at previous full word", () => {
    // budget = 156 - 2 = 154
    // build: 150 chars of short words + a 20-char word that starts at position 150
    // candidate = text.slice(0, 154) → includes positions 150..153, i.e. first 4 chars of the long word
    // the regex /\s+(?=\S*$)/ finds the last whitespace before the long word (position 149)
    // so the implementation should cut there, before the long word
    const knownWords = "ab ".repeat(50); // 50 × "ab " = 150 chars, ends with a space
    const longWord = "x".repeat(20); // starts at position 150, 4 chars land inside budget
    const text = knownWords + longWord + " extra text";
    const result = truncateDescription(text);
    const beforeOmission = result.slice(0, result.length - OMISSION.length);
    // The long word should not appear at all in the truncated output
    expect(beforeOmission).not.toContain("x");
    expect(result.length).toBeLessThanOrEqual(156);
    expect(result.endsWith(OMISSION)).toBe(true);
  });

  it("hard-cuts a single unbroken word longer than 156 chars — result <= 156 and ends with omission", () => {
    const text = "x".repeat(200); // no whitespace at all
    const result = truncateDescription(text);
    expect(result.length).toBeLessThanOrEqual(156);
    expect(result.endsWith(OMISSION)).toBe(true);
  });

  it("hard-cut produces exactly max chars when no space found", () => {
    const text = "x".repeat(200);
    const result = truncateDescription(text);
    // candidate = text.slice(0, 154) = 154 x's, no space → cut = 154 chars, + " …" = 156
    expect(result.length).toBe(156);
  });

  it("respects a custom max parameter smaller than default", () => {
    const max = 50;
    const text = "word ".repeat(20); // 100 chars
    const result = truncateDescription(text, max);
    expect(result.length).toBeLessThanOrEqual(max);
    expect(result.endsWith(OMISSION)).toBe(true);
  });

  it("respects a custom max parameter larger than default", () => {
    const max = 200;
    const text = "a".repeat(200); // exactly 200
    // text.length === max → returned unchanged
    expect(truncateDescription(text, max)).toBe(text);
  });

  it("custom max: does not truncate when text fits within custom max", () => {
    const text = "Short text.";
    expect(truncateDescription(text, 20)).toBe(text);
  });
});

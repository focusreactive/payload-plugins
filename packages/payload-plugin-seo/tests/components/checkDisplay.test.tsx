import { describe, expect, it } from "vitest";
import { CHECK_IDS } from "../../src/constants/checkIds";
import { getDisplay, pillFor } from "../../src/components/SeoDrawer/checkDisplay";
import type { CheckResult } from "../../src/engine/types";

const ALL = [...CHECK_IDS.keyphrase, ...CHECK_IDS.onPage, ...CHECK_IDS.readability];
const mk = (id: string, over: Partial<CheckResult> = {}): CheckResult => ({ id, status: "good", score: 9, ...over });

describe("CHECK_DISPLAY registry", () => {
  it("has an explicit entry for every CheckId (no accidental presence fallthrough)", () => {
    // PRESENCE fallback is referentially shared; a real entry is a distinct object.
    const fallback = getDisplay("definitely-not-a-real-id");
    for (const id of ALL) {
      expect(getDisplay(id), `${id} must have its own entry`).not.toBe(fallback);
    }
  });

  it("falls back to presence for an unknown id", () => {
    expect(getDisplay("totally-unknown").type).toBe("presence");
  });

  it("builds gauge props for keyphraseDensity from data", () => {
    const entry = getDisplay("keyphraseDensity");
    expect(entry.type).toBe("value-range");
    if (entry.type !== "value-range") throw new Error("type");
    expect(entry.toProps(mk("keyphraseDensity", { data: { densityPct: 2 } }))).not.toBeNull();
    expect(entry.toProps(mk("keyphraseDensity", { data: undefined }))).toBeNull();
  });

  it("suppresses the density gauge under 100 words and shows a count pill instead", () => {
    const entry = getDisplay("keyphraseDensity");
    if (entry.type !== "value-range") throw new Error("type");
    const shortText = mk("keyphraseDensity", { data: { densityPct: 100, textLength: 12, count: 1 } });
    expect(entry.toProps(shortText)).toBeNull();
    expect(pillFor(shortText)).toBe("1 use");
    const longText = mk("keyphraseDensity", { data: { densityPct: 1.8, textLength: 250, count: 5 } });
    expect(entry.toProps(longText)).not.toBeNull();
    expect(pillFor(longText)).toBe("1.8%");
  });

  it("uses a value pill for textLength and the default pill otherwise", () => {
    expect(pillFor(mk("textLength", { data: { words: 530 } }))).toBe("530 words");
    expect(pillFor(mk("introductionKeyword", { status: "bad" }))).toBe("Problem");
    expect(pillFor(mk("images", { data: { count: 1 } }))).toBe("1 image");
  });
});

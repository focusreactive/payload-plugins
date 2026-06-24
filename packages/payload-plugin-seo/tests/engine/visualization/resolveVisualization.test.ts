import { describe, expect, it } from "vitest";
import type { CheckResult, Status } from "../../../src/engine/types/analysis";
import { resolveVisualization } from "../../../src/engine/visualization/resolveVisualization";

const check = (id: string, status: Status = "good"): CheckResult => ({ id, status, score: 9 });

describe("resolveVisualization — presence", () => {
  it.each(["introductionKeyword", "keyphraseInSEOTitle", "images", "singleH1"])(
    "resolves %s to presence",
    (id) => {
      expect(resolveVisualization(check(id), undefined)).toEqual({ type: "presence" });
    }
  );
});

describe("resolveVisualization — value-range", () => {
  it("resolves keyphraseLength with words to a value-range gauge", () => {
    const v = resolveVisualization(check("keyphraseLength"), { words: 4 });

    expect(v.type).toBe("value-range");
    if (v.type !== "value-range") return;
    expect(v.gauge.bands.length).toBeGreaterThan(0);
    const goodLabels = v.gauge.labels.filter((label) => label.emphasis === "good");
    expect(goodLabels).toHaveLength(1);
  });

  it("resolves keyphraseDensity with densityPct to a value-range", () => {
    const v = resolveVisualization(check("keyphraseDensity"), { densityPct: 1.5 });

    expect(v.type).toBe("value-range");
  });

  it("falls back to presence when keyphraseLength has no numeric words", () => {
    expect(resolveVisualization(check("keyphraseLength"), {})).toEqual({ type: "presence" });
  });

  it("falls back to presence when keyphraseDensity textLength is below 100", () => {
    const v = resolveVisualization(check("keyphraseDensity"), { densityPct: 1.5, textLength: 50 });

    expect(v).toEqual({ type: "presence" });
  });
});

describe("resolveVisualization — proportion (links)", () => {
  it("resolves externalLinks to a proportion segment with legend", () => {
    const v = resolveVisualization(check("externalLinks", "good"), { total: 5, follow: 3 });

    expect(v.type).toBe("proportion");
    if (v.type !== "proportion") return;
    expect(v.segment.countLabel).toBe("3 / 5");
    expect(v.segment.filledStatus).toBe("good");
    expect(v.segment.legend).toEqual([
      { tone: "good", label: "3 dofollow" },
      { tone: "muted", label: "2 nofollow" },
    ]);
  });

  it("resolves internalLinks with warn status and inverse legend", () => {
    const v = resolveVisualization(check("internalLinks", "warn"), { total: 4, follow: 1 });

    expect(v.type).toBe("proportion");
    if (v.type !== "proportion") return;
    expect(v.segment.filledStatus).toBe("warn");
    expect(v.segment.legend).toEqual([
      { tone: "good", label: "1 dofollow" },
      { tone: "muted", label: "3 nofollow" },
    ]);
  });
});

describe("resolveVisualization — proportion (imageKeyphrase)", () => {
  it("forces warn status regardless of a good check status", () => {
    const v = resolveVisualization(check("imageKeyphrase", "good"), { total: 2, matched: 1 });

    expect(v.type).toBe("proportion");
    if (v.type !== "proportion") return;
    expect(v.segment.filledStatus).toBe("warn");
  });
});

describe("resolveVisualization — count-drilldown labels", () => {
  it("uses singular 'link' for one textCompetingLinks item", () => {
    const v = resolveVisualization(check("textCompetingLinks"), {
      items: [{ left: "a", right: "x" }],
    });

    expect(v.type).toBe("count-drilldown");
    if (v.type !== "count-drilldown") return;
    expect(v.drilldown.label).toBe("Show 1 link");
  });

  it("uses plural 'links' for three textCompetingLinks items", () => {
    const v = resolveVisualization(check("textCompetingLinks"), {
      items: [
        { left: "a", right: "x" },
        { left: "b", right: "y" },
        { left: "c", right: "z" },
      ],
    });

    expect(v.type).toBe("count-drilldown");
    if (v.type !== "count-drilldown") return;
    expect(v.drilldown.label).toBe("Show 3 links");
  });

  it("uses singular 'section' for one subheadingsTooLong item", () => {
    const v = resolveVisualization(check("subheadingsTooLong"), {
      items: [{ left: "a", right: "x" }],
    });

    expect(v.type).toBe("count-drilldown");
    if (v.type !== "count-drilldown") return;
    expect(v.drilldown.label).toBe("Show 1 section");
  });

  it("uses plural 'sections' for two subheadingsTooLong items", () => {
    const v = resolveVisualization(check("subheadingsTooLong"), {
      items: [
        { left: "a", right: "x" },
        { left: "b", right: "y" },
      ],
    });

    expect(v.type).toBe("count-drilldown");
    if (v.type !== "count-drilldown") return;
    expect(v.drilldown.label).toBe("Show 2 sections");
  });

  it("reads the 'paragraphs' key for one textParagraphTooLong item", () => {
    const v = resolveVisualization(check("textParagraphTooLong"), {
      paragraphs: [{ left: "a", right: "x" }],
    });

    expect(v.type).toBe("count-drilldown");
    if (v.type !== "count-drilldown") return;
    expect(v.drilldown.label).toBe("Show 1 paragraph");
  });

  it("uses plural 'paragraphs' for two textParagraphTooLong items", () => {
    const v = resolveVisualization(check("textParagraphTooLong"), {
      paragraphs: [
        { left: "a", right: "x" },
        { left: "b", right: "y" },
      ],
    });

    expect(v.type).toBe("count-drilldown");
    if (v.type !== "count-drilldown") return;
    expect(v.drilldown.label).toBe("Show 2 paragraphs");
  });

  it("uses singular 'group' for one sentenceBeginnings item", () => {
    const v = resolveVisualization(check("sentenceBeginnings"), {
      items: [{ left: "a", right: "x" }],
    });

    expect(v.type).toBe("count-drilldown");
    if (v.type !== "count-drilldown") return;
    expect(v.drilldown.label).toBe("Show 1 group");
  });

  it("uses plural 'groups' for two sentenceBeginnings items", () => {
    const v = resolveVisualization(check("sentenceBeginnings"), {
      items: [
        { left: "a", right: "x" },
        { left: "b", right: "y" },
      ],
    });

    expect(v.type).toBe("count-drilldown");
    if (v.type !== "count-drilldown") return;
    expect(v.drilldown.label).toBe("Show 2 groups");
  });

  it("falls back to presence when a drilldown has no items", () => {
    expect(resolveVisualization(check("textCompetingLinks"), { items: [] })).toEqual({
      type: "presence",
    });
    expect(resolveVisualization(check("textCompetingLinks"), {})).toEqual({ type: "presence" });
  });
});

describe("resolveVisualization — distribution", () => {
  it("resolves keyphraseDistribution positions", () => {
    const v = resolveVisualization(check("keyphraseDistribution"), { positions: [10, 50, 90] });

    expect(v.type).toBe("distribution");
    if (v.type !== "distribution") return;
    expect(v.distribution.positions).toEqual([10, 50, 90]);
  });

  it("falls back to presence when positions are empty or missing", () => {
    expect(resolveVisualization(check("keyphraseDistribution"), { positions: [] })).toEqual({
      type: "presence",
    });
    expect(resolveVisualization(check("keyphraseDistribution"), {})).toEqual({ type: "presence" });
  });
});

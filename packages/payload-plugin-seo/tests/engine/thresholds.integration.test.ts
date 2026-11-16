import { describe, expect, it } from "vitest";
import { runAnalysis } from "../../src/engine/runAnalysis";
import type { AnalysisInput, AnalysisResult, CheckResult } from "../../src/engine/types/analysis";
import type { GaugeModel } from "../../src/engine/types/visualization";
import { createTranslator } from "../../src/translations";
import type { SeoThresholds } from "../../src/types/config";

const sentence =
  "Payload makes structured content easy to manage for editors and developers alike.";
const fiveWordKeyphrase = "structured content manage editors developers";

const input: AnalysisInput = {
  title: "Structured content with Payload",
  slug: "structured-content",
  description: "d".repeat(130),
  contentHtml: `<p>${Array.from({ length: 22 }, () => sentence).join(" ")}</p>`,
  keyphrase: "payload",
  keyphrases: [
    { text: "payload", synonyms: [] },
    { text: fiveWordKeyphrase, synonyms: [] },
  ],
  locale: "en_US",
  site: { name: "Site", baseUrl: "https://example.com" },
  has: { seoTitle: true, metaDescription: true, slug: true, content: true },
};

const t = createTranslator("en", undefined);

function allChecks(result: AnalysisResult): CheckResult[] {
  return [...result.keyphrase.checks, ...result.onPage.checks, ...result.readability.checks];
}

function analyze(thresholds?: SeoThresholds, analysisInput = input): AnalysisResult {
  return runAnalysis(analysisInput, thresholds);
}

function checkOf(result: AnalysisResult, id: string): CheckResult {
  const check = allChecks(result).find((c) => c.id === id);
  if (!check) throw new Error(`missing check ${id}`);
  return check;
}

function gaugeOf(check: CheckResult): GaugeModel {
  if (check.viz?.type !== "value-range") throw new Error(`${check.id} has no gauge`);
  return check.viz.gauge;
}

function goodLabel(check: CheckResult): string | undefined {
  return gaugeOf(check).labels.find((label) => label.emphasis === "good")?.text;
}

function relatedLength(result: AnalysisResult): CheckResult | undefined {
  return result.relatedKeyphrases[0]?.result.checks.find((c) => c.id === "keyphraseLength");
}

const withFocus = (keyphrase: string): AnalysisInput => ({
  ...input,
  keyphrase,
  keyphrases: [{ text: keyphrase, synonyms: [] }],
});

describe("gauges", () => {
  it.each([
    ["a one-word keyphrase", input],
    ["a five-word keyphrase", withFocus(fiveWordKeyphrase)],
  ])("colour the marker with the check status for %s", (_name, analysisInput) => {
    for (const check of allChecks(analyze(undefined, analysisInput))) {
      if (check.viz?.type === "value-range") {
        expect(check.viz.gauge.markerStatus, check.id).toBe(check.status);
      }
    }
  });

  it("band the meta description and title width the way Yoast scores them", () => {
    const result = analyze();
    const bandStatuses = (id: string) =>
      gaugeOf(checkOf(result, id)).bands.map((band) => band.status);

    expect(bandStatuses("metaDescriptionLength")).toEqual(["warn", "good", "warn"]);
    expect(bandStatuses("titleWidth")).toEqual(["good", "bad"]);
    expect(goodLabel(checkOf(result, "titleWidth"))).toBe("0px–600px");
  });

  it("show the keyphrase density Yoast scores", () => {
    const check = checkOf(analyze(undefined, withFocus(fiveWordKeyphrase)), "keyphraseDensity");
    expect(check.status).toBe("bad");
    expect(gaugeOf(check).markerLabel).toBe("19.7%");
  });
});

describe("configured thresholds", () => {
  it("score like the defaults when they repeat the default numbers", () => {
    const scores = (result: AnalysisResult) =>
      Object.fromEntries(allChecks(result).map((check) => [check.id, check.score]));

    const configured = analyze({ textLength: { min: 300 }, keyphraseDensity: { max: 3 } });
    expect(scores(configured)).toEqual(scores(analyze()));
  });

  it("drive the keyphrase length check and its gauge", () => {
    const focus = withFocus(fiveWordKeyphrase);
    expect(checkOf(analyze(undefined, focus), "keyphraseLength").status).toBe("warn");

    const check = checkOf(analyze({ keyphraseLength: { max: 5 } }, focus), "keyphraseLength");
    expect(check.status).toBe("good");
    expect(gaugeOf(check).markerStatus).toBe("good");
    expect(goodLabel(check)).toBe("0–5");
  });

  it("apply to related keyphrases too", () => {
    expect(relatedLength(analyze())?.status).toBe("warn");
    expect(relatedLength(analyze({ keyphraseLength: { max: 5 } }))?.status).toBe("good");
  });

  it("drive the keyphrase density check and its gauge", () => {
    expect(checkOf(analyze(), "keyphraseDensity").status).toBe("bad");

    const check = checkOf(analyze({ keyphraseDensity: { max: 10 } }), "keyphraseDensity");
    expect(check.status).toBe("good");
    expect(goodLabel(check)).toBe("0.5%–10.0%");
  });

  it("drive the meta description length check and its gauge", () => {
    expect(checkOf(analyze(), "metaDescriptionLength").status).toBe("good");

    const check = checkOf(
      analyze({ metaDescriptionLength: { min: 140, max: 160 } }),
      "metaDescriptionLength"
    );
    expect(check.status).toBe("warn");
    expect(gaugeOf(check).markerStatus).toBe("warn");
    expect(goodLabel(check)).toBe("140–160");
  });

  it("drive the text length check, its gauge and the numbers in its texts", () => {
    expect(checkOf(analyze(), "textLength").status).toBe("warn");
    expect(
      checkOf(analyze({ textLength: { min: 260, acceptableMin: 200 } }), "textLength").status
    ).toBe("good");

    const check = checkOf(analyze({ textLength: { min: 400, acceptableMin: 350 } }), "textLength");
    expect(check.status).toBe("bad");
    expect(gaugeOf(check).markerStatus).toBe("bad");
    expect(check.recommendation && t(check.recommendation.key, check.recommendation.vars)).toBe(
      "Add more content — aim for at least 400 words."
    );
    expect(t("check.textLength.tip", check.tipVars)).toBe(
      "Total words vs the recommended minimum (400)."
    );
  });

  it("drive the sentence length check and the share of long sentences", () => {
    expect(checkOf(analyze(), "textSentenceLength").status).toBe("good");

    const check = checkOf(
      analyze({ textSentenceLength: { maxSentenceWords: 10 } }),
      "textSentenceLength"
    );
    expect(check.status).toBe("bad");
    expect(check.data).toEqual({ pct: 100 });
    expect(gaugeOf(check).markerStatus).toBe("bad");
  });

  it("drive the reading ease status and its gauge", () => {
    expect(checkOf(analyze(), "fleschReadingEase").status).toBe("bad");

    const check = checkOf(
      analyze({ fleschReadingEase: { min: 30, acceptableMin: 20 } }),
      "fleschReadingEase"
    );
    expect(check.status).toBe("good");
    expect(gaugeOf(check).markerStatus).toBe("good");
    expect(goodLabel(check)).toBe("30–100");
    expect(t("check.fleschReadingEase.tip", check.tipVars)).toContain("Aim for 30+.");
  });

  it("drive the title width check and its gauge", () => {
    const longTitle = {
      ...input,
      title: "A very long SEO title that runs well past the width a search result shows",
    };
    expect(checkOf(analyze(), "titleWidth").status).toBe("good");
    expect(checkOf(analyze(undefined, longTitle), "titleWidth").status).toBe("bad");

    const check = checkOf(analyze({ titleWidth: { max: 700 } }, longTitle), "titleWidth");
    expect(check.status).toBe("good");
    expect(gaugeOf(check).markerStatus).toBe("good");
  });
});

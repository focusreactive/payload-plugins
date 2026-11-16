import { beforeAll, describe, expect, it } from "vitest";
import { ensureLanguagePack } from "../../src/components/SeoDrawer/languagePacks";
import { runAnalysis } from "../../src/engine/runAnalysis";
import type { AnalysisInput, AnalysisResult, CheckResult } from "../../src/engine/types/analysis";
import { createTranslator } from "../../src/translations";
import type { SeoThresholds } from "../../src/types/config";

const t = createTranslator("en", undefined);

function inputFor(locale: string, keyphrase: string, contentHtml: string): AnalysisInput {
  return {
    title: "Title",
    slug: "slug",
    description: "d".repeat(70),
    contentHtml,
    keyphrase,
    keyphrases: [{ text: keyphrase, synonyms: [] }],
    locale,
    site: { name: "Site", baseUrl: "https://example.com" },
    has: { seoTitle: true, metaDescription: true, slug: true, content: true },
  };
}

function checkOf(result: AnalysisResult, id: string): CheckResult {
  const check = [
    ...result.keyphrase.checks,
    ...result.onPage.checks,
    ...result.readability.checks,
  ].find((c) => c.id === id);
  if (!check) throw new Error(`missing check ${id}`);
  return check;
}

function gaugeThresholds(check: CheckResult): number[] {
  if (check.viz?.type !== "value-range") throw new Error(`${check.id} has no gauge`);
  return check.viz.gauge.bands.slice(0, -1).map((band) => Number(band.endPct.toFixed(4)));
}

const spanish = inputFor(
  "es_ES",
  "zapatillas",
  `<p>${"Las zapatillas para correr son importantes para todos los corredores. ".repeat(30)}</p>`
);
const japanese = inputFor("ja_JP", "日本語", `<p>${"日本語の文章です。".repeat(60)}</p>`);
const catalan = inputFor(
  "ca_ES",
  "sabates córrer bones lleugeres barates noves",
  `<p>${"Les sabates córrer bones lleugeres barates noves són importants per a tothom. ".repeat(30)}</p>`
);
const german = inputFor(
  "de_DE",
  "gute leichte schuhe zum laufen kaufen",
  `<p>${"Gute leichte Schuhe zum Laufen kaufen ist wichtig für alle Läufer. ".repeat(30)}</p>`
);

const analyze = (input: AnalysisInput, configured?: SeoThresholds) =>
  runAnalysis(input, configured);

describe("thresholds of the analysis language", () => {
  beforeAll(async () => {
    await ensureLanguagePack("es_ES", ["en", "es", "ja", "ca", "de"]);
    await ensureLanguagePack("ja_JP", ["en", "es", "ja", "ca", "de"]);
    await ensureLanguagePack("ca_ES", ["en", "es", "ja", "ca", "de"]);
    await ensureLanguagePack("de_DE", ["en", "es", "ja", "ca", "de"]);
  });

  it("states the Spanish sentence length in the tip", () => {
    const check = checkOf(analyze(spanish), "textSentenceLength");

    expect(check.tipVars).toMatchObject({ maxSentenceWords: 25 });
    expect(t("check.textSentenceLength.tip", check.tipVars)).toBe(
      "Share of sentences longer than 25 words."
    );
  });

  it("bands the Japanese meta description and text length the way Yoast scores them", () => {
    const result = analyze(japanese);

    expect(checkOf(result, "metaDescriptionLength").tipVars).toEqual({ min: 60, max: 80 });
    expect(checkOf(result, "metaDescriptionLength").status).toBe("good");
    expect(checkOf(result, "textLength").tipVars).toEqual({ min: 600, acceptableMin: 500 });
  });

  it("lets a configured number win over the Japanese one", () => {
    const check = checkOf(analyze(japanese, { textLength: { min: 450 } }), "textLength");

    expect(check.tipVars).toEqual({ min: 450, acceptableMin: 500 });
    expect(check.status).toBe("good");
  });

  it("uses the longer keyphrase bands of a language without function words", () => {
    const check = checkOf(analyze(catalan), "keyphraseLength");

    expect(check.tipVars).toEqual({ max: 6, acceptableMax: 9 });
    expect(check.data).toEqual({ words: 6 });
    expect(check.status).toBe("good");
    expect(gaugeThresholds(check)).toEqual([50, 75]);
  });

  it("keeps the default keyphrase bands in German, as Yoast does for regular pages", () => {
    const check = checkOf(analyze(german), "keyphraseLength");

    expect(check.tipVars).toEqual({ max: 4, acceptableMax: 8 });
    expect(check.viz?.type === "value-range" && check.viz.gauge.markerStatus).toBe(check.status);
  });
});

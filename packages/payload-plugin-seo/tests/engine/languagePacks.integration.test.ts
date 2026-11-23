import { describe, expect, it } from "vitest";
import { ensureLanguagePack } from "../../src/components/SeoDrawer/languagePacks";
import { buildPaper } from "../../src/engine/buildPaper";
import { runAnalysis } from "../../src/engine/runAnalysis";
import { makeResearcher } from "../../src/engine/researcherAdapter";
import type { AnalysisInput } from "../../src/engine/types/analysis";

const input = (locale: string): AnalysisInput => ({
  title: "Běžecké boty",
  slug: "bezecke-boty",
  description: "Nejlepší běžecké boty",
  contentHtml:
    "<h2>Běžecké boty</h2><p>Běžecké boty jsou důležité. Proto je dobré vybrat správné běžecké boty, protože chrání nohy.</p>",
  keyphrase: "běžecké boty",
  keyphrases: [{ text: "běžecké boty", synonyms: [] }],
  locale,
  site: { name: "Shop", baseUrl: "https://shop.cz" },
  has: { seoTitle: true, metaDescription: true, slug: true, content: true },
});

describe("ensureLanguagePack with a real Yoast language pack", () => {
  it("leaves a locale outside supportedLocales on the English researcher", async () => {
    await ensureLanguagePack("de_DE", ["en"]);

    const de = makeResearcher(buildPaper(input("de_DE")));
    const en = makeResearcher(buildPaper(input("en_US")));

    expect(de.constructor).toBe(en.constructor);
  });

  it("analyses a supported locale with its own researcher", async () => {
    const beforeLoad = runAnalysis(input("cs_CZ"));

    await ensureLanguagePack("cs_CZ", ["en", "cs"]);

    const cs = makeResearcher(buildPaper(input("cs_CZ")));
    const en = makeResearcher(buildPaper(input("en_US")));

    expect(cs.constructor).not.toBe(en.constructor);
    expect(runAnalysis(input("cs_CZ"))).not.toEqual(beforeLoad);
  });
});

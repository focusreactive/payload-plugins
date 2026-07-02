import { describe, expect, it } from "vitest";
import type {
  AnalysisInput,
  AnalysisResult,
  KeyphraseInput,
  RelatedKeyphraseResult,
} from "../../src/engine/types/analysis";

describe("multi-keyphrase types", () => {
  it("AnalysisInput carries an ordered keyphrases list plus focus keyphrase", () => {
    const kp: KeyphraseInput = { text: "payload cms", synonyms: ["payloadcms"] };
    const input: AnalysisInput = {
      title: "t",
      slug: "s",
      description: "d",
      contentHtml: "",
      keyphrase: "payload cms",
      keyphrases: [kp, { text: "headless cms", synonyms: [] }],
      locale: "en_EN",
      site: { name: "n", baseUrl: "" },
      has: { seoTitle: true, metaDescription: true, slug: true, content: false },
    };
    expect(input.keyphrases[0].text).toBe("payload cms");
    expect(input.keyphrase).toBe(input.keyphrases[0].text);
  });

  it("AnalysisResult exposes relatedKeyphrases keyed by text", () => {
    const rk: RelatedKeyphraseResult = {
      text: "headless cms",
      result: { ringScore: 60, status: "warn", checks: [] },
    };
    const partial: Pick<AnalysisResult, "relatedKeyphrases"> = { relatedKeyphrases: [rk] };
    expect(partial.relatedKeyphrases[0].text).toBe("headless cms");
  });
});

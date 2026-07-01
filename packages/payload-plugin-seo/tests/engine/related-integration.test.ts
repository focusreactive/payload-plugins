/**
 * Integration coverage (NO mocks): runAnalysis with a focus + related keyphrase
 * must not throw and must populate relatedKeyphrases keyed by text.
 */
import { describe, expect, it } from "vitest";
import { runAnalysis } from "../../src/engine/runAnalysis";
import type { AnalysisInput } from "../../src/engine/types/analysis";

const contentHtml = `
<h1>Best Running Shoes for Every Runner</h1>
<p>Running shoes are essential for any serious runner who wants to protect their feet and improve performance. The best running shoes provide cushioning, support, and durability. Trail shoes in particular help on rough terrain.</p>
<h2>Why Running Shoes Matter</h2>
<p>However, not all running shoes are equal. Consider your gait, arch type, and the surface you run on. Trail shoes are built for grip.</p>
`.trim();

const input: AnalysisInput = {
  title: "Best Running Shoes for Every Runner",
  slug: "running-shoes",
  description: "Discover the best running shoes for every type of runner.",
  contentHtml,
  keyphrase: "running shoes",
  keyphrases: [
    { text: "running shoes", synonyms: ["trainers"] },
    { text: "trail shoes", synonyms: [] },
  ],
  locale: "en_US",
  site: { name: "RunShop", baseUrl: "https://runshop.com" },
  has: { seoTitle: true, metaDescription: true, slug: true, content: true },
};

describe("runAnalysis — focus + related (integration, no mocks)", () => {
  it("does not throw when a related keyphrase is present", () => {
    expect(() => runAnalysis(input)).not.toThrow();
  });

  it("populates relatedKeyphrases keyed by the related text", () => {
    const result = runAnalysis(input);
    expect(result.relatedKeyphrases).toHaveLength(1);
    expect(result.relatedKeyphrases[0].text).toBe("trail shoes");
    expect(result.relatedKeyphrases[0].result.checks.length).toBeGreaterThan(0);
  });
});

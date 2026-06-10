/**
 * Integration coverage: runAnalysis with an empty keyphrase must not throw and
 * must still populate all top-level result sections.
 */
import { describe, it, expect } from "vitest";
import { runAnalysis } from "../../src/engine/runAnalysis";
import type { AnalysisInput } from "../../src/engine/types/analysis";

const contentHtml = `
<h1>Best Running Shoes for Every Runner</h1>

<p>Running shoes are essential for any serious runner who wants to protect their feet and improve their performance on the track or trail. The best running shoes provide cushioning, support, and durability that every athlete needs to succeed during long training sessions and race day events.</p>

<h2>Why Running Shoes Matter</h2>

<p>However, not all running shoes are created equal, and therefore it is important to choose the right pair. Furthermore, you should consider your gait, arch type, and the surface you run on when selecting running shoes. Moreover, the fit and weight of the shoe will also affect your comfort and speed.</p>

<h2>Our Recommendations</h2>

<p>These running shoes are our top picks this season. Running shoes from leading brands like Brooks, ASICS, and Nike dominate the market. However, newer brands also produce excellent running shoes that rival the established names.</p>
`.trim();

const input: AnalysisInput = {
  title: "Best Running Shoes for Every Runner",
  slug: "running-shoes",
  description: "Discover the best running shoes for every type of runner.",
  contentHtml,
  keyphrase: "",
  locale: "en_US",
  site: { name: "RunShop", baseUrl: "https://runshop.com" },
  has: {
    seoTitle: true,
    metaDescription: true,
    slug: true,
    content: true,
  },
};

describe("runAnalysis — empty keyphrase (integration, no mocks)", () => {
  it("runs without throwing when keyphrase is empty", () => {
    expect(() => runAnalysis(input)).not.toThrow();
  });

  it("populates onPage.checks with at least one check", () => {
    const result = runAnalysis(input);

    expect(result.onPage.checks.length).toBeGreaterThan(0);
  });

  it("populates readability.checks without throwing", () => {
    const result = runAnalysis(input);

    expect(result.readability.checks).toBeDefined();
  });

  it("marks every prominent word as non-keyphrase when keyphrase is empty", () => {
    const result = runAnalysis(input);

    expect(result.vitals.prominentWords.every((w) => !w.isKeyphrase)).toBe(true);
  });

  it("returns a string for serp.title", () => {
    const result = runAnalysis(input);

    expect(typeof result.serp.title).toBe("string");
  });

  it("returns the inclusive section", () => {
    const result = runAnalysis(input);

    expect(result.inclusive).toBeDefined();
  });
});

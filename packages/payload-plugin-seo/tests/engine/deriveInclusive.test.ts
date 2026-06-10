/**
 * Integration coverage for deriveInclusive against the real yoastseo library.
 * Guards the bug where flag extraction discarded every assessor result, so all
 * content scored 100 / "good" regardless of non-inclusive phrases present.
 */
import { describe, expect, it } from "vitest";
import { buildPaper } from "../../src/engine/buildPaper";
import { deriveInclusive } from "../../src/engine/runAnalysis/services/derive-inclusive";
import type { AnalysisInput } from "../../src/engine/types/analysis";

function inputWith(contentHtml: string): AnalysisInput {
  return {
    title: "About our team",
    slug: "about",
    description: "About our team.",
    contentHtml,
    keyphrase: "team",
    locale: "en_US",
    site: { name: "Acme", baseUrl: "https://acme.com" },
    has: { seoTitle: true, metaDescription: true, slug: true, content: true },
  };
}

describe("deriveInclusive (real yoastseo)", () => {
  it("flags a non-inclusive phrase and lowers the ring score", () => {
    const paper = buildPaper(inputWith("<p>The firemen arrived at the scene quickly.</p>"));

    const result = deriveInclusive(paper);

    expect(result.categories.length).toBeGreaterThan(0);
    expect(result.ringScore).toBeLessThan(100);
  });

  it("maps yoast category keys to plugin display names", () => {
    const paper = buildPaper(inputWith("<p>The firemen arrived at the scene quickly.</p>"));

    const result = deriveInclusive(paper);

    const gendered = result.categories.find((c) => c.name === "Gendered language");
    expect(gendered, "expected a 'Gendered language' category").toBeDefined();
    expect(result.cleanCategories).not.toContain("Gendered language");
  });

  it("extracts the matched term and an HTML-free suggestion", () => {
    const paper = buildPaper(inputWith("<p>The firemen arrived at the scene quickly.</p>"));

    const result = deriveInclusive(paper);
    const flag = result.categories.flatMap((c) => c.flags).find((f) => f.term.includes("firemen"));

    expect(flag, "expected a flag for 'firemen'").toBeDefined();
    expect(flag?.suggestion).toContain("firefighters");
    expect(flag?.suggestion).not.toContain("<i>");
    expect(flag?.location.length).toBeGreaterThan(0);
  });

  it("reports all categories clean for fully inclusive content", () => {
    const paper = buildPaper(inputWith("<p>The firefighters arrived at the scene quickly.</p>"));

    const result = deriveInclusive(paper);

    expect(result.categories).toEqual([]);
    expect(result.ringScore).toBe(100);
    expect(result.status).toBe("good");
  });
});

import { describe, expect, it } from "vitest";
import { deriveSerp } from "../../src/engine/deriveSerp";
import type { AnalysisInput } from "../../src/engine/types";

const base: AnalysisInput = {
  title: "Best Running Shoes 2026",
  slug: "running-shoes",
  description: "Discover the best running shoes for every surface.",
  contentHtml: "",
  keyphrase: "running shoes",
  locale: "en_US",
  site: { name: "RunShop", baseUrl: "https://runshop.com" },
  has: { seoTitle: true, metaDescription: true, slug: true, content: true },
};

describe("deriveSerp", () => {
  it("builds the snippet preview fields + meter measurements", () => {
    const serp = deriveSerp(base);
    expect(serp.url).toBe("https://runshop.com/running-shoes");
    expect(serp.siteName).toBe("RunShop");
    expect(serp.descriptionChars).toBe(base.description.length);
    expect(serp.titleWidthPx).toBeGreaterThan(0);
  });
});

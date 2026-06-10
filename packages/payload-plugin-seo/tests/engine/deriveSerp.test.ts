import { describe, expect, it } from "vitest";

import { deriveSerp } from "../../src/engine/runAnalysis/services/derive-serp";
import type { AnalysisInput } from "../../src/engine/types/analysis";

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
  it("builds URL from baseUrl + slug and passes through title, description, siteName", () => {
    const result = deriveSerp(base);
    expect(result.url).toBe("https://runshop.com/running-shoes");
    expect(result.title).toBe(base.title);
    expect(result.description).toBe(base.description);
    expect(result.siteName).toBe("RunShop");
  });

  it("falls back to path-only URL when baseUrl is empty", () => {
    const result = deriveSerp({ ...base, site: { ...base.site, baseUrl: "" } });
    expect(result.url).toBe("/running-shoes");
  });

  it("result has exactly the four expected keys and no progress fields", () => {
    const result = deriveSerp(base);
    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("url");
    expect(result).toHaveProperty("description");
    expect(result).toHaveProperty("siteName");
    expect(result).not.toHaveProperty("titleProgress");
    expect(result).not.toHaveProperty("descriptionProgress");
  });

  it("empty title and description pass through unchanged without throwing", () => {
    const result = deriveSerp({ ...base, title: "", description: "" });
    expect(result.title).toBe("");
    expect(result.description).toBe("");
  });
});

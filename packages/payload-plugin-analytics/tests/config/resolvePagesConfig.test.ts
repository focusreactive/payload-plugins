// tests/config/resolvePagesConfig.test.ts
import { describe, expect, it } from "vitest";
import { resolvePagesConfig } from "../../src/config/resolvePagesConfig";

describe("resolvePagesConfig", () => {
  it("returns null when pages config is absent", () => {
    expect(resolvePagesConfig(undefined)).toBeNull();
  });

  it("normalizes string collections to { slug, publishedOnly:true }", () => {
    const r = resolvePagesConfig({ collections: ["page", "posts"] });
    expect(r?.collections).toEqual([
      { slug: "page", publishedOnly: true, titleField: "title" },
      { slug: "posts", publishedOnly: true, titleField: "title" },
    ]);
  });

  it("preserves explicit publishedOnly + synthetic refs + default dim names", () => {
    const r = resolvePagesConfig({
      collections: [{ slug: "page" }, { slug: "events", publishedOnly: false }],
      syntheticRefs: ["__home"],
    });
    expect(r?.collections).toEqual([
      { slug: "page", publishedOnly: true, titleField: "title" },
      { slug: "events", publishedOnly: false, titleField: "title" },
    ]);
    expect(r?.syntheticRefs).toEqual(["__home"]);
    expect(r?.dimensions).toEqual({
      pageRef: "customEvent:fr_page_ref",
      contentLocale: "customEvent:fr_content_locale",
    });
  });

  it("allows overriding dimension api names", () => {
    const r = resolvePagesConfig({
      collections: ["page"],
      dimensions: { pageRef: "customEvent:my_ref" },
    });
    expect(r?.dimensions.pageRef).toBe("customEvent:my_ref");
    expect(r?.dimensions.contentLocale).toBe("customEvent:fr_content_locale");
  });
});

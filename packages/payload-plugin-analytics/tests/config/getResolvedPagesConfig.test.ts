// tests/config/getResolvedPagesConfig.test.ts
import { describe, expect, it } from "vitest";
import { setPluginConfig, getResolvedPagesConfig } from "../../src/config";

describe("getResolvedPagesConfig", () => {
  it("returns null when no pages config set", () => {
    setPluginConfig({
      ga4: {
        propertyId: "1",
        measurementId: "G-X",
        serviceAccount: { clientEmail: "", privateKey: "" },
      },
    });
    expect(getResolvedPagesConfig()).toBeNull();
  });

  it("returns resolved pages config when present", () => {
    setPluginConfig({
      ga4: {
        propertyId: "1",
        measurementId: "G-X",
        serviceAccount: { clientEmail: "", privateKey: "" },
      },
      pages: { collections: ["page"] },
    });
    expect(getResolvedPagesConfig()?.collections).toEqual([
      { slug: "page", publishedOnly: true, titleField: "title" },
    ]);
  });
});

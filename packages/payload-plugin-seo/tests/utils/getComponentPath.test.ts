import { describe, expect, it } from "vitest";
import { getComponentPath } from "../../src/utils/config/getComponentPath";

describe("getComponentPath", () => {
  it("builds an importMap path under the package export root", () => {
    expect(getComponentPath("components/SeoButton")).toBe("@focus-reactive/payload-plugin-seo/components/SeoButton#SeoButton");
  });

  it("supports a custom export name", () => {
    expect(getComponentPath("components/SeoButton", "default")).toBe("@focus-reactive/payload-plugin-seo/components/SeoButton#default");
  });
});

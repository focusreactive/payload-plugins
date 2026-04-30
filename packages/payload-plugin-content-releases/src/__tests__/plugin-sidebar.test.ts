import { describe, it, expect } from "vitest";
import { contentReleasesPlugin } from "../plugin";
import type { Config } from "payload";

function makeBaseConfig(): Config {
  return {
    collections: [
      { slug: "pages", fields: [{ name: "title", type: "text" }] },
      { slug: "posts", fields: [{ name: "title", type: "text" }] },
    ],
    globals: [],
  } as unknown as Config;
}

describe("plugin sidebar injection", () => {
  it("should inject _releases UI field into enabled collections", () => {
    const plugin = contentReleasesPlugin({ enabledCollections: ["pages"] });
    const config = plugin(makeBaseConfig()) as Config;
    const pages = config.collections?.find((c: any) => c.slug === "pages");
    const releasesField = pages?.fields.find((f: any) => f.name === "_releases");
    expect(releasesField).toBeDefined();
    expect((releasesField as any).type).toBe("ui");
    expect((releasesField as any).admin?.position).toBe("sidebar");
  });

  it("should NOT inject _releases field into non-enabled collections", () => {
    const plugin = contentReleasesPlugin({ enabledCollections: ["pages"] });
    const config = plugin(makeBaseConfig()) as Config;
    const posts = config.collections?.find((c: any) => c.slug === "posts");
    const releasesField = posts?.fields.find((f: any) => f.name === "_releases");
    expect(releasesField).toBeUndefined();
  });

  it("should pass enabledCollections via admin.custom", () => {
    const plugin = contentReleasesPlugin({ enabledCollections: ["pages"] });
    const config = plugin(makeBaseConfig()) as Config;
    expect((config.admin as any)?.custom?.contentReleases?.enabledCollections).toEqual(["pages"]);
  });

  it("should preserve existing fields on enabled collections", () => {
    const plugin = contentReleasesPlugin({ enabledCollections: ["pages"] });
    const config = plugin(makeBaseConfig()) as Config;
    const pages = config.collections?.find((c: any) => c.slug === "pages");
    const titleField = pages?.fields.find((f: any) => f.name === "title");
    expect(titleField).toBeDefined();
  });
});

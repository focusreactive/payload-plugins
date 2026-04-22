import { describe, it, expect, vi } from "vitest";
import { contentReleasesPlugin } from "../plugin";
import { RELEASES_SLUG, RELEASE_ITEMS_SLUG } from "../constants";
import type { Config } from "payload";

function makeBaseConfig(overrides?: Partial<Config>): Config {
  return {
    collections: [
      { slug: "pages", fields: [] },
      { slug: "posts", fields: [] },
    ],
    globals: [],
    ...overrides,
  } as unknown as Config;
}

describe("contentReleasesPlugin", () => {
  it("should return a function", () => {
    const plugin = contentReleasesPlugin({ enabledCollections: ["pages"] });
    expect(typeof plugin).toBe("function");
  });

  it("should inject releases collection", () => {
    const plugin = contentReleasesPlugin({ enabledCollections: ["pages"] });
    const config = plugin(makeBaseConfig()) as Config;
    const releases = config.collections?.find((c: any) => c.slug === RELEASES_SLUG);
    expect(releases).toBeDefined();
  });

  it("should inject release-items collection", () => {
    const plugin = contentReleasesPlugin({ enabledCollections: ["pages"] });
    const config = plugin(makeBaseConfig()) as Config;
    const items = config.collections?.find((c: any) => c.slug === RELEASE_ITEMS_SLUG);
    expect(items).toBeDefined();
  });

  it("should preserve existing collections", () => {
    const plugin = contentReleasesPlugin({ enabledCollections: ["pages"] });
    const config = plugin(makeBaseConfig()) as Config;
    const pages = config.collections?.find((c: any) => c.slug === "pages");
    const posts = config.collections?.find((c: any) => c.slug === "posts");
    expect(pages).toBeDefined();
    expect(posts).toBeDefined();
  });

  it("should warn about unknown collection slugs", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const plugin = contentReleasesPlugin({ enabledCollections: ["nonexistent"] });
    plugin(makeBaseConfig());
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("nonexistent"));
    warnSpy.mockRestore();
  });

  it("should pass access config to releases collection", () => {
    const readFn = () => true;
    const plugin = contentReleasesPlugin({
      enabledCollections: ["pages"],
      access: { releases: { read: readFn } },
    });
    const config = plugin(makeBaseConfig()) as Config;
    const releases = config.collections?.find((c: any) => c.slug === RELEASES_SLUG);
    expect((releases as any)?.access?.read).toBe(readFn);
  });
});

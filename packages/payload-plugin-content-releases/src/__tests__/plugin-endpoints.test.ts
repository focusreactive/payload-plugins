import { describe, it, expect } from "vitest";
import { contentReleasesPlugin } from "../plugin";
import type { Config } from "payload";

function makeBaseConfig(): Config {
  return {
    collections: [{ slug: "pages", fields: [] }],
    globals: [],
  } as unknown as Config;
}

describe("plugin endpoints", () => {
  it("should register publish endpoint", () => {
    const plugin = contentReleasesPlugin({ enabledCollections: ["pages"] });
    const config = plugin(makeBaseConfig()) as Config;
    const endpoint = config.endpoints?.find((e: any) => e.path === "/content-releases/:id/publish");
    expect(endpoint).toBeDefined();
    expect(endpoint?.method).toBe("post");
  });

  it("should register conflicts endpoint", () => {
    const plugin = contentReleasesPlugin({ enabledCollections: ["pages"] });
    const config = plugin(makeBaseConfig()) as Config;
    const endpoint = config.endpoints?.find((e: any) => e.path === "/content-releases/:id/conflicts");
    expect(endpoint).toBeDefined();
    expect(endpoint?.method).toBe("get");
  });
});

import type { Config } from "payload";
import { describe, expect, it } from "vitest";

import { FoldersConfigError, foldersPlugin, pluginSlug } from "../../src/index.js";

const buildHostConfig = (): Config =>
  ({
    collections: [{ slug: "pages", fields: [{ name: "title", type: "text" }] }],
    secret: "unit",
  }) as unknown as Config;

describe("foldersPlugin", () => {
  it("registers under its package slug", () => {
    expect(foldersPlugin({ collections: {} }).slug).toBe(pluginSlug);
  });

  it("keeps the host collections", () => {
    const result = foldersPlugin({ collections: { pages: true } as never })(buildHostConfig());

    expect(result).toMatchObject({ collections: [{ slug: "pages" }], secret: "unit" });
  });

  it("throws the config error for an unknown collection", () => {
    expect(() =>
      foldersPlugin({ collections: { missing: true } as never })(buildHostConfig())
    ).toThrow(FoldersConfigError);
  });
});

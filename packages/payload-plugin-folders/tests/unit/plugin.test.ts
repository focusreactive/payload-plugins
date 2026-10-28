import { describe, expect, it } from "vitest";

import { foldersPlugin, pluginSlug } from "../../src/index.js";

describe("foldersPlugin", () => {
  it("registers under its package slug", () => {
    expect(foldersPlugin({ collections: {} }).slug).toBe(pluginSlug);
  });

  it("returns the config unchanged", async () => {
    const config = { collections: [], secret: "unit" };
    const result = await foldersPlugin({ collections: {} })(config as never);

    expect(result).toBe(config);
  });
});

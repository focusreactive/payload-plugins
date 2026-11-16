import type { Config } from "payload";
import { describe, expect, it } from "vitest";

import { stackedEditingPlugin } from "../src/plugin.js";

const config = {
  collections: [
    { slug: "pages", fields: [] },
    {
      slug: "posts",
      fields: [],
      admin: { components: { edit: { beforeDocumentControls: ["x"] } } },
    },
  ],
  globals: [{ slug: "header", fields: [] }],
} as unknown as Config;

const outletsOf = (result: Config) =>
  result.collections?.map((c) => c.admin?.components?.edit?.beforeDocumentControls ?? []);

describe("stackedEditingPlugin", () => {
  it("adds the outlet with the default mode to every collection and global", async () => {
    const result = await stackedEditingPlugin()(config);
    const outlet = {
      path: "@focus-reactive/payload-plugin-stacked-editing/client#StackedEditing",
      clientProps: { defaultMode: "panel" },
    };
    expect(outletsOf(result)).toEqual([[outlet], ["x", outlet]]);
    expect(result.globals?.[0]?.admin?.components?.elements?.beforeDocumentControls).toEqual([
      outlet,
    ]);
  });

  it("passes defaultMode and honours the allow-lists", async () => {
    const result = await stackedEditingPlugin({
      collections: ["posts"],
      defaultMode: "inline",
      globals: [],
    })(config);
    expect(outletsOf(result)).toEqual([
      [],
      [
        "x",
        {
          path: "@focus-reactive/payload-plugin-stacked-editing/client#StackedEditing",
          clientProps: { defaultMode: "inline" },
        },
      ],
    ]);
    expect(
      result.globals?.[0]?.admin?.components?.elements?.beforeDocumentControls
    ).toBeUndefined();
  });

  it("does nothing when disabled", async () => {
    expect(await stackedEditingPlugin({ enabled: false })(config)).toBe(config);
  });
});

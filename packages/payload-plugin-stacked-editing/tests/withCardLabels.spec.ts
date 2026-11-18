import type { Block, Config, Field } from "payload";
import { describe, expect, it } from "vitest";

import { CARD_LABEL_COMPONENT } from "../src/lib/constants.js";
import { withCardLabelFields } from "../src/lib/withCardLabels.js";
import { stackedEditing } from "../src/plugin.js";

const leaf: Block = { slug: "leaf", fields: [{ name: "text", type: "text" }] };
const custom: Block = {
  slug: "custom",
  admin: { components: { Label: "/my/Label#Label" } },
  fields: [{ name: "items", type: "array", fields: [{ name: "a", type: "text" }] }],
};

const fields: Field[] = [
  { name: "title", type: "text" },
  {
    name: "layout",
    type: "blocks",
    blocks: [
      { slug: "outer", fields: [{ name: "nested", type: "blocks", blocks: [leaf] }] },
      custom,
    ],
  },
  {
    type: "tabs",
    tabs: [
      {
        label: "Tab",
        fields: [
          {
            name: "links",
            type: "array",
            admin: { components: { RowLabel: "/my/RowLabel#RowLabel" } },
            fields: [],
          },
        ],
      },
    ],
  },
  { type: "row", fields: [{ name: "chips", type: "array", fields: [] }] },
];

const at = (value: unknown, ...keys: (string | number)[]): unknown =>
  keys.reduce<unknown>((current, key) => (current as Record<string, unknown>)?.[key], value);

describe("withCardLabelFields", () => {
  const result = withCardLabelFields(fields);

  it("labels blocks and arrays that have no label, at any depth", () => {
    expect(at(result, 1, "blocks", 0, "admin", "components", "Label")).toBe(CARD_LABEL_COMPONENT);
    expect(
      at(result, 1, "blocks", 0, "fields", 0, "blocks", 0, "admin", "components", "Label")
    ).toBe(CARD_LABEL_COMPONENT);
    expect(at(result, 3, "fields", 0, "admin", "components", "RowLabel")).toBe(
      CARD_LABEL_COMPONENT
    );
    expect(at(result, 1, "blocks", 1, "fields", 0, "admin", "components", "RowLabel")).toBe(
      CARD_LABEL_COMPONENT
    );
  });

  it("never overrides a label set by the user", () => {
    expect(at(result, 1, "blocks", 1, "admin", "components", "Label")).toBe("/my/Label#Label");
    expect(at(result, 2, "tabs", 0, "fields", 0, "admin", "components", "RowLabel")).toBe(
      "/my/RowLabel#RowLabel"
    );
  });

  it("does not mutate the input", () => {
    expect(at(fields, 1, "blocks", 0, "admin")).toBeUndefined();
  });
});

describe("stackedEditing cards option", () => {
  const config = {
    blocks: [leaf],
    collections: [
      { slug: "pages", fields },
      { slug: "posts", fields },
    ],
  } as unknown as Config;

  it("adds cards to managed collections and config-level blocks only", async () => {
    const result = await stackedEditing({ collections: ["pages"] })(config);
    expect(
      at(result.collections, 0, "fields", 3, "fields", 0, "admin", "components", "RowLabel")
    ).toBe(CARD_LABEL_COMPONENT);
    expect(at(result.collections, 1, "fields", 3, "fields", 0, "admin")).toBeUndefined();
    expect(at(result.blocks, 0, "admin", "components", "Label")).toBe(CARD_LABEL_COMPONENT);
  });

  it("can be turned off", async () => {
    const result = await stackedEditing({ cards: false })(config);
    expect(
      at(result.collections, 0, "fields", 3, "fields", 0, "admin", "components")
    ).toBeUndefined();
    expect(at(result.blocks, 0, "admin", "components")).toBeUndefined();
  });
});

import type { FieldState } from "payload";

import { describe, expect, it } from "vitest";

import { formPathOfKey } from "../../src/admin/openField/formPathOfKey";

const field = (value: unknown): FieldState => ({ value });

const formState = {
  blocks: {
    rows: [
      { blockType: "cards", id: "row-b" },
      { blockType: "hero", id: "row-a" },
    ],
  },
  "blocks.0.items": { rows: [{ id: "item-y" }, { id: "item-x" }] },
  "blocks.0.items.1.caption": field("One"),
  "blocks.1.heading": field("First"),
  "meta.description": field("About"),
  gallery: field(1),
  prices: { rows: [{ id: 7 }, { id: 42 }] },
  steps: { rows: [{ id: "1" }, { id: "0" }] },
  "steps.1.label": field("Start"),
  title: field("Home"),
};

const formPathOf = (key: string, path: string) => formPathOfKey({ key, path }, formState);

describe("formPathOfKey", () => {
  it("is the key itself for a field outside any row", () => {
    expect(formPathOf("title", "title")).toBe("title");
    expect(formPathOf("meta.description", "meta.description")).toBe("meta.description");
  });

  it("puts the index the row has in the form now in place of its id", () => {
    expect(formPathOf("blocks.row-a.heading", "blocks.0.heading")).toBe("blocks.1.heading");
  });

  it("follows the rows of every level", () => {
    expect(formPathOf("blocks.row-b.items.item-x.caption", "blocks.1.items.0.caption")).toBe(
      "blocks.0.items.1.caption"
    );
  });

  it("reads a row id that looks like an index as an id", () => {
    expect(formPathOf("steps.0.label", "steps.0.label")).toBe("steps.1.label");
  });

  it("finds a row whose id the form holds as a number", () => {
    expect(formPathOf("prices.42.amount", "prices.0.amount")).toBe("prices.1.amount");
  });

  it("addresses the row itself when the key ends with its id", () => {
    expect(formPathOf("blocks.row-a", "blocks.0")).toBe("blocks.1");
  });

  it("stops at the list when the form no longer has the row", () => {
    expect(formPathOf("blocks.row-gone.heading", "blocks.1.heading")).toBe("blocks");
  });

  it("stops at the nested list when only the inner row is gone", () => {
    expect(formPathOf("blocks.row-b.items.item-gone.caption", "blocks.0.items.2.caption")).toBe(
      "blocks.0.items"
    );
  });

  it("stops at a list the form holds no rows for", () => {
    expect(formPathOf("gallery.photo-1.caption", "gallery.0.caption")).toBe("gallery");
  });
});

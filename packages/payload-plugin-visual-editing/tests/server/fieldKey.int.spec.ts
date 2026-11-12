import { describe, expect, it } from "vitest";

import { fieldKeyOf, fieldKeyOfMarker, valueAtSteps } from "../../src/shared/fieldKey";

describe("fieldKeyOf", () => {
  it("joins field names and row ids in the order they are walked", () => {
    expect(
      fieldKeyOf([{ name: "layout" }, { rowId: "row-a" }, { name: "cta" }, { name: "label" }])
    ).toBe("layout.row-a.cta.label");
  });
});

describe("fieldKeyOfMarker", () => {
  it("takes the key a marker states", () => {
    expect(fieldKeyOfMarker({ key: "layout.row-a.heading", path: "layout.0.heading" })).toBe(
      "layout.row-a.heading"
    );
  });

  it("falls back to the path of a field outside any row", () => {
    expect(fieldKeyOfMarker({ path: "meta.description" })).toBe("meta.description");
  });

  it("has no key for a row field whose marker does not state one", () => {
    expect(fieldKeyOfMarker({ path: "layout.0.heading" })).toBeNull();
    expect(fieldKeyOfMarker({ path: "layout.1.items.12.caption" })).toBeNull();
  });
});

const savedDocument = {
  title: "Home",
  blocks: [
    { id: "row-b", blockType: "cards", items: [{ id: "item-x", label: "First card" }] },
    { id: "row-a", blockType: "hero", heading: { title: "Hero" } },
  ],
};

describe("valueAtSteps", () => {
  it("reads a field outside any row", () => {
    expect(valueAtSteps(savedDocument, [{ name: "title" }])).toEqual({ value: "Home" });
  });

  it("finds a row by its id, whatever index it is saved at", () => {
    expect(
      valueAtSteps(savedDocument, [
        { name: "blocks" },
        { rowId: "row-a" },
        { name: "heading" },
        { name: "title" },
      ])
    ).toEqual({ value: "Hero" });
  });

  it("finds nested rows by their ids", () => {
    expect(
      valueAtSteps(savedDocument, [
        { name: "blocks" },
        { rowId: "row-b" },
        { name: "items" },
        { rowId: "item-x" },
        { name: "label" },
      ])
    ).toEqual({ value: "First card" });
  });

  it("has nothing for a row that is not saved yet", () => {
    expect(
      valueAtSteps(savedDocument, [
        { name: "blocks" },
        { rowId: "row-new" },
        { name: "heading" },
        { name: "title" },
      ])
    ).toBeNull();
  });

  it("has nothing for rows of a list that is not saved yet", () => {
    expect(
      valueAtSteps(savedDocument, [{ name: "links" }, { rowId: "row-a" }, { name: "label" }])
    ).toBeNull();
  });

  it("reads a field the saved document has no value for", () => {
    expect(valueAtSteps(savedDocument, [{ name: "subtitle" }])).toEqual({ value: undefined });
  });
});

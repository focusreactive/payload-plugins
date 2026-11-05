import { describe, expect, it } from "vitest";
import { localizedFieldPaths, storedFieldCheckOf, storedFieldNames } from "../../src/utils/fields";

const flattenedFields = [
  { name: "title", type: "text" },
  { name: "notes", type: "join" },
  { name: "titleUpper", type: "text", virtual: true },
];

describe("stored fields", () => {
  it("builds the stored field names of a sanitized config once", () => {
    expect([...storedFieldNames(flattenedFields)]).toEqual(["title"]);
    expect(storedFieldNames(flattenedFields)).toBe(storedFieldNames(flattenedFields));
  });

  it("checks keys against the sanitized fields when Payload provides them", () => {
    const isStoredField = storedFieldCheckOf([])({ flattenedFields });
    expect(["title", "notes", "titleUpper", "globalType"].filter(isStoredField)).toEqual(["title"]);
  });

  it("falls back to leaving out the join and virtual fields of the raw config", () => {
    const isStoredField = storedFieldCheckOf([
      { name: "title", type: "text" },
      { name: "notes", type: "join", collection: "comments", on: "page" },
      { type: "row", fields: [{ name: "computed", type: "text", virtual: true }] },
    ])(undefined);
    expect(["title", "notes", "computed", "body"].filter(isStoredField)).toEqual(["title", "body"]);
  });
});

describe("localized field paths", () => {
  it("lists localized fields at any depth, stopping at a localized container", () => {
    expect(
      localizedFieldPaths([
        { name: "title", type: "text", localized: true },
        { name: "body", type: "text" },
        { type: "row", fields: [{ name: "slug", type: "text", localized: true }] },
        {
          name: "seo",
          type: "group",
          fields: [{ name: "description", type: "text", localized: true }],
        },
        {
          name: "links",
          type: "array",
          fields: [{ name: "label", type: "text", localized: true }],
        },
        {
          name: "gallery",
          type: "array",
          localized: true,
          fields: [{ name: "caption", type: "text", localized: true }],
        },
      ])
    ).toEqual([
      ["title"],
      ["slug"],
      ["seo", "description"],
      ["links", { rows: true }, "label"],
      ["gallery"],
    ]);
  });
});

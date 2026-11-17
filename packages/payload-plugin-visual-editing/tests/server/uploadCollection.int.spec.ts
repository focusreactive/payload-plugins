import type { Field } from "payload";

import { describe, expect, it } from "vitest";

import {
  buildEditableSchema,
  uploadCollectionAt,
} from "../../src/shared/editableSchema/editableSchema";

const schema = buildEditableSchema([
  { name: "title", type: "text" },
  { name: "image", type: "upload", relationTo: "media" },
  { name: "gallery", type: "upload", relationTo: "media", hasMany: true },
  { name: "eitherFile", type: "upload", relationTo: ["media", "documents"] },
  { name: "related", type: "relationship", relationTo: "pages" },
  { name: "cover", type: "upload", relationTo: "media", hidden: true },
  { name: "stamp", type: "upload", relationTo: "media", admin: { readOnly: true } },
  { name: "seo", type: "group", fields: [{ name: "image", type: "upload", relationTo: "media" }] },
  {
    name: "layout",
    type: "blocks",
    blocks: [{ slug: "hero", fields: [{ name: "image", type: "upload", relationTo: "media" }] }],
  },
] as Field[]);

describe("uploadCollectionAt", () => {
  it("names the collection of an upload field that holds one document of one collection", () => {
    expect(uploadCollectionAt(schema, [{ name: "image" }])).toBe("media");
  });

  it("names the collection of an upload field of a group and of a block row", () => {
    const ofRow = [{ name: "layout" }, { blockType: "hero", rowId: "row-1" }, { name: "image" }];

    expect(uploadCollectionAt(schema, [{ name: "seo" }, { name: "image" }])).toBe("media");
    expect(uploadCollectionAt(schema, ofRow)).toBe("media");
  });

  it("answers nothing for an upload field that holds many documents", () => {
    expect(uploadCollectionAt(schema, [{ name: "gallery" }])).toBeNull();
  });

  it("answers nothing for an upload field of several collections", () => {
    expect(uploadCollectionAt(schema, [{ name: "eitherFile" }])).toBeNull();
  });

  it("answers nothing for a field that is not an upload", () => {
    expect(uploadCollectionAt(schema, [{ name: "title" }])).toBeNull();
    expect(uploadCollectionAt(schema, [{ name: "related" }])).toBeNull();
    expect(uploadCollectionAt(schema, [{ name: "seo" }])).toBeNull();
  });

  it("answers nothing for a field the editor cannot reach", () => {
    expect(uploadCollectionAt(schema, [{ name: "cover" }])).toBeNull();
    expect(uploadCollectionAt(schema, [{ name: "stamp" }])).toBeNull();
    expect(uploadCollectionAt(schema, [{ name: "missing" }])).toBeNull();
    expect(uploadCollectionAt(schema, [])).toBeNull();
  });

  it("keeps the upload field a plain type name for those who compare schemas", () => {
    expect(buildEditableSchema([{ name: "image", type: "upload", relationTo: "media" }])).toEqual({
      image: "upload",
    });
  });
});

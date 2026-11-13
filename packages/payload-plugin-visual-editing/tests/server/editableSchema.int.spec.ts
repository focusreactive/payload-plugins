import type { Field } from "payload";

import { vercelStegaSplit } from "@vercel/stega";
import { describe, expect, it } from "vitest";

import type { FieldStep } from "../../src/shared/fieldKey";

import {
  buildEditableSchema,
  holderFieldAt,
  isMarkable,
  schemaPathOfRichText,
} from "../../src/shared/editableSchema/editableSchema";
import { markRead } from "../../src/server/markRead";

const fields = [
  { name: "title", type: "text" },
  { name: "slug", type: "text" },
  { name: "tenant", type: "text" },
  { name: "secret", type: "text", hidden: true },
  { name: "internalNote", type: "textarea", admin: { hidden: true } },
  { name: "locked", type: "text", admin: { readOnly: true } },
] as Field[];

const NO_LOCALES: ReadonlySet<string> = new Set();

describe("buildEditableSchema", () => {
  it("keeps the fields the server may mark", () => {
    expect(buildEditableSchema(fields)).toEqual({ tenant: "text", title: "text" });
  });

  it("leaves out the excluded field names", () => {
    expect(buildEditableSchema(fields, { excludeFieldNames: ["tenant"] })).toEqual({
      title: "text",
    });
  });
});

describe("fields with hidden: true", () => {
  const hiddenFields = [
    { name: "title", type: "text" },
    { name: "secret", type: "text", hidden: true },
    { name: "audit", type: "group", hidden: true, fields: [{ name: "note", type: "text" }] },
    { name: "revisions", type: "array", hidden: true, fields: [{ name: "summary", type: "text" }] },
    {
      name: "drafts",
      type: "blocks",
      hidden: true,
      blocks: [{ slug: "memo", fields: [{ name: "body", type: "textarea" }] }],
    },
    {
      type: "tabs",
      tabs: [
        {
          name: "internal",
          fields: [
            { name: "owner", type: "text" },
            { name: "token", type: "text", hidden: true },
          ],
        },
      ],
    },
  ] as Field[];

  it("are left out together with everything they contain", () => {
    expect(buildEditableSchema(hiddenFields)).toEqual({
      internal: { owner: "text" },
      title: "text",
    });
  });

  it("get no marker on a draft read", () => {
    const page = {
      drafts: [{ blockType: "memo", body: "Do not publish", id: "row-a" }],
      id: "page-1",
      internal: { owner: "Marketing", token: "t0ken" },
      revisions: [{ id: "row-b", summary: "Second pass" }],
    };
    const marked = markRead(page, {
      identity: { collectionSlug: "pages", docId: "page-1", kind: "collection" },
      schema: buildEditableSchema(hiddenFields),
    });

    expect(vercelStegaSplit(marked.internal.owner).encoded).not.toBe("");
    expect(marked).toMatchObject({
      drafts: [{ body: "Do not publish" }],
      internal: { token: "t0ken" },
      revisions: [{ summary: "Second pass" }],
    });
  });
});

const markableSchema = buildEditableSchema([
  { name: "title", type: "text" },
  { name: "summary", type: "textarea" },
  { name: "contact", type: "email" },
  { name: "price", type: "number" },
  { name: "status", type: "select", options: ["draft", "live"] },
  { name: "author", type: "relationship", relationTo: "users" },
  { name: "image", type: "upload", relationTo: "media" },
  { name: "snippet", type: "code" },
  { name: "body", type: "richText" },
  { name: "disabledBody", type: "richText", admin: { disabled: true } },
  { name: "meta", type: "group", fields: [{ name: "description", type: "textarea" }] },
  { type: "group", fields: [{ name: "kicker", type: "text" }] },
  {
    type: "tabs",
    tabs: [
      { name: "seo", fields: [{ name: "headline", type: "text" }] },
      { label: "Content", fields: [{ name: "lead", type: "text" }] },
    ],
  },
  { type: "row", fields: [{ name: "left", type: "text" }] },
  { type: "collapsible", label: "More", fields: [{ name: "footnote", type: "text" }] },
  {
    name: "links",
    type: "array",
    fields: [
      { name: "label", type: "text" },
      { name: "note", type: "richText" },
      { name: "target", type: "relationship", relationTo: "page" },
    ],
  },
  {
    name: "blocks",
    type: "blocks",
    blocks: [
      {
        slug: "hero",
        fields: [
          { name: "heading", type: "text" },
          { name: "variant", type: "select", options: ["wide"] },
          { name: "items", type: "array", fields: [{ name: "caption", type: "text" }] },
        ],
      },
    ],
  },
] as Field[]);

const names = (...path: string[]): FieldStep[] => path.map((name) => ({ name }));
const heroRow: FieldStep = { blockType: "hero", rowId: "row-a" };
const arrayRow: FieldStep = { rowId: "row-x" };

describe("isMarkable", () => {
  it.each([
    ["a text field", names("title")],
    ["a textarea field", names("summary")],
    ["an email field", names("contact")],
    ["a field in a named group", names("meta", "description")],
    ["a field in an unnamed group", names("kicker")],
    ["a field in a named tab", names("seo", "headline")],
    ["a field in an unnamed tab", names("lead")],
    ["a field in a row", names("left")],
    ["a field in a collapsible", names("footnote")],
    ["rich text", names("body")],
    ["rich text in an array row", [...names("links"), arrayRow, ...names("note")]],
    ["a field in an array row", [...names("links"), arrayRow, ...names("label")]],
    ["a field in a block", [...names("blocks"), heroRow, ...names("heading")]],
    [
      "a field in an array inside a block",
      [...names("blocks"), heroRow, ...names("items"), arrayRow, ...names("caption")],
    ],
  ])("accepts %s", (_label, steps) => {
    expect(isMarkable(markableSchema, steps)).toBe(true);
  });

  it.each([
    ["a number", names("price")],
    ["a select", names("status")],
    ["a relationship id", names("author")],
    ["an upload", names("image")],
    ["code", names("snippet")],
    ["rich text that is disabled in the admin", names("disabledBody")],
    ["a form field the schema does not have", names("password")],
    ["the id of an array row", [...names("links"), arrayRow, ...names("id")]],
    ["a relationship inside an array row", [...names("links"), arrayRow, ...names("target")]],
    ["the id of a block", [...names("blocks"), heroRow, ...names("id")]],
    ["the type of a block", [...names("blocks"), heroRow, ...names("blockType")]],
    ["the name of a block", [...names("blocks"), heroRow, ...names("blockName")]],
    ["a select inside a block", [...names("blocks"), heroRow, ...names("variant")]],
    [
      "a field of a block the schema does not have",
      [...names("blocks"), { blockType: "unknown", rowId: "row-b" }, ...names("heading")],
    ],
    ["a container", names("meta")],
    ["an inherited object key", names("constructor")],
  ])("rejects %s", (_label, steps) => {
    expect(isMarkable(markableSchema, steps)).toBe(false);
  });
});

describe("the holder field at a field path", () => {
  const schema = buildEditableSchema([
    {
      blocks: [{ fields: [{ name: "title", type: "text" }], slug: "hero" }],
      name: "layout",
      type: "blocks",
    },
  ] as Field[]);

  it("stays in the blocks field for a row whose blockType names an inherited property", () => {
    const data = { layout: [{ blockType: "constructor", title: "Hello" }] };

    expect(holderFieldAt(schema, data, ["layout", "0", "hero", "title"], NO_LOCALES)).toMatchObject(
      {
        kind: "text",
      }
    );
  });

  it("finds no field for a segment that names an inherited property", () => {
    expect(holderFieldAt(schema, {}, ["constructor"], NO_LOCALES)).toBeNull();
  });
});

const richTextSchema = buildEditableSchema([
  { name: "body", type: "richText" },
  { name: "title", type: "text" },
  { fields: [{ name: "note", type: "richText" }], name: "list", type: "array" },
  { fields: [{ name: "intro", type: "richText" }], name: "meta", type: "group" },
  {
    blocks: [
      { fields: [{ name: "content", type: "richText" }], slug: "content" },
      { fields: [{ name: "caption", type: "text" }], slug: "image" },
    ],
    name: "blocks",
    type: "blocks",
  },
]);

describe("the schema path of a rich text field key", () => {
  it.each([
    ["body", "body"],
    ["list.row-1.note", "list.note"],
    ["list.row-2.note", "list.note"],
    ["meta.intro", "meta.intro"],
    ["blocks.row-1.content", "blocks.content"],
  ])("of %s is %s", (key, path) => {
    expect(schemaPathOfRichText(richTextSchema, key)).toBe(path);
  });

  it.each(["title", "list.row-1.missing", "blocks.row-1.caption", "row-1.body", "list.a.b.note"])(
    "does not exist for %s",
    (key) => {
      expect(schemaPathOfRichText(richTextSchema, key)).toBeNull();
    }
  );
});

import type { CollectionConfig, Where } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";

const emptyEditor = {
  root: { type: "root", children: [], direction: null, format: "", indent: 0, version: 1 },
};

const text = (value: string) => ({
  root: {
    type: "root",
    direction: "ltr",
    format: "",
    indent: 0,
    version: 1,
    children: [
      {
        type: "paragraph",
        version: 1,
        direction: "ltr",
        format: "",
        indent: 0,
        children: [
          {
            type: "text",
            text: value,
            version: 1,
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
          },
        ],
      },
    ],
  },
});

const docs: CollectionConfig = {
  slug: "docs",
  fields: [
    { name: "title", type: "text", localized: true },
    { name: "body", type: "richText", localized: true },
    {
      name: "sections",
      type: "blocks",
      localized: true,
      blocks: [
        { slug: "hero", fields: [{ name: "heading", type: "text" }] },
        { slug: "quote", fields: [{ name: "saying", type: "text" }] },
      ],
    },
    {
      name: "features",
      type: "array",
      localized: true,
      fields: [{ name: "caption", type: "text" }],
    },
  ],
};

const drafted: CollectionConfig = {
  slug: "drafted",
  versions: { drafts: true },
  fields: [{ name: "title", type: "text", localized: true }],
};

let ctx: TestPayload;
let id: string;
let draftedId: string;

const matches = async (locale: string, where: Where): Promise<number> => {
  const found = await ctx.payload.find({
    collection: "docs",
    locale,
    fallbackLocale: false,
    depth: 0,
    where: { and: [{ id: { equals: id } }, where] },
  });
  return found.docs.length;
};

beforeAll(async () => {
  ctx = await bootTestPayload({ collections: [docs, drafted] });
  const made = await ctx.payload.create({
    collection: "docs",
    locale: "en",
    data: {
      title: "An English title",
      body: text("Some English prose"),
      sections: [{ blockType: "hero", heading: "An English heading" }],
      features: [{ caption: "An English caption" }],
    },
  });
  id = String(made.id);

  await ctx.payload.update({
    collection: "docs",
    id,
    locale: "de",
    data: { body: emptyEditor },
  });

  const draftedDoc = await ctx.payload.create({
    collection: "drafted",
    locale: "en",
    draft: true,
    data: { title: "A drafted English title" },
  });
  draftedId = String(draftedDoc.id);
});

afterAll(async () => {
  await ctx?.cleanup();
});

describe("`exists` on a path inside a localized list", () => {
  it("answers for a block's field in the locale that holds it", async () => {
    expect(await matches("en", { "sections.heading": { exists: true } })).toBe(1);
  });

  it("answers nothing for the same path in a locale that was never written", async () => {
    expect(await matches("de", { "sections.heading": { exists: true } })).toBe(0);
  });

  it("answers for an array's field the same way", async () => {
    expect(await matches("en", { "features.caption": { exists: true } })).toBe(1);
    expect(await matches("de", { "features.caption": { exists: true } })).toBe(0);
  });
});

describe("`exists` on a path a second block type does not declare", () => {
  it("still answers for the block that does declare it", async () => {
    expect(await matches("en", { "sections.heading": { exists: true } })).toBe(1);
    expect(await matches("en", { "sections.saying": { exists: true } })).toBe(0);
  });
});

describe("`exists` on a locale written only as a draft", () => {
  const draftedMatches = async (locale: string): Promise<number> => {
    const found = await ctx.payload.find({
      collection: "drafted",
      locale,
      fallbackLocale: false,
      draft: true,
      depth: 0,
      where: { and: [{ id: { equals: draftedId } }, { title: { exists: true } }] },
    });
    return found.docs.length;
  };

  it("sees the draft's locale, and still says nothing of one never written", async () => {
    expect(await draftedMatches("en")).toBe(1);
    expect(await draftedMatches("de")).toBe(0);
  });
});

describe("`exists` on a rich text saved with an empty editor", () => {
  it("says the value is there, because an empty editor state is still a value", async () => {
    expect(await matches("de", { body: { exists: true } })).toBe(1);
  });

  it("says the same for the locale that holds real prose", async () => {
    expect(await matches("en", { body: { exists: true } })).toBe(1);
  });
});

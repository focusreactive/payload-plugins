import { vercelStegaDecode, vercelStegaSplit } from "@vercel/stega";
import { describe, expect, it } from "vitest";

import type { SchemaField } from "../../src/shared/editableSchema/editableSchema";

import { buildEditableSchema } from "../../src/shared/editableSchema/editableSchema";
import { markRead } from "../../src/server/markRead";
import { isPlainObject } from "../../src/shared/plainObject";

const pageFields = [
  { name: "title", type: "text" },
  { name: "note", type: "text" },
  { name: "related", relationTo: "pages", type: "relationship" },
  { name: "header", relationTo: "headers", type: "relationship" },
  { hasMany: true, name: "footers", relationTo: "headers", type: "relationship" },
  { name: "banner", relationTo: ["headers", "pages"], type: "relationship" },
  { fields: [{ name: "label", type: "text" }], name: "list", type: "array" },
  { fields: [{ name: "title", type: "text" }], name: "internal", type: "group" },
  { fields: [{ name: "heading", type: "text" }], name: "hero", type: "group" },
  {
    blocks: [
      {
        fields: [
          { name: "title", type: "text" },
          { fields: [{ name: "label", type: "text" }], name: "items", type: "array" },
          { name: "related", relationTo: "pages", type: "relationship" },
        ],
        slug: "cards",
      },
      {
        fields: [
          { name: "title", options: ["Newsletter"], type: "select" },
          { admin: { readOnly: true }, name: "note", type: "text" },
        ],
        slug: "signup",
      },
    ],
    name: "layout",
    type: "blocks",
  },
] as SchemaField[];

const pagesSchema = buildEditableSchema(pageFields, { excludeFieldNames: ["internal"] });

const readAsDraft = <T extends { id: string }>(page: T): T =>
  markRead(page, {
    identity: { collectionSlug: "pages", docId: page.id, kind: "collection" },
    instantPreview: true,
    schema: pagesSchema,
  });

type MarkedText = { marker: unknown; text: string };

const markedTextsIn = (value: unknown): MarkedText[] => {
  if (typeof value === "string") {
    const marker = vercelStegaDecode(value);
    return marker ? [{ marker, text: vercelStegaSplit(value).cleaned }] : [];
  }
  if (Array.isArray(value)) return value.flatMap(markedTextsIn);
  return isPlainObject(value) ? Object.values(value).flatMap(markedTextsIn) : [];
};

const newsletterPage = () => ({
  id: "B",
  layout: [
    {
      blockType: "cards",
      id: "cards-1",
      items: [
        { id: "item-1", label: "Monthly" },
        { id: "item-2", label: "Weekly" },
      ],
      title: "Newsletter",
    },
  ],
  title: "Newsletter",
});

const inPage = { collectionSlug: "pages", kind: "collection" } as const;

describe("markers of a populated document", () => {
  it("names a block field of the populated document, not its title", () => {
    const home = readAsDraft({ id: "A", related: readAsDraft(newsletterPage()), title: "Home" });

    expect(vercelStegaDecode(home.related.layout[0]?.title ?? "")).toEqual({
      ...inPage,
      docId: "B",
      key: "layout.cards-1.title",
      path: "layout.0.title",
    });
    expect(vercelStegaDecode(home.related.title)).toEqual({ ...inPage, docId: "B", path: "title" });
  });

  it("names a row of an array nested in a block of the populated document", () => {
    const home = readAsDraft({ id: "A", related: readAsDraft(newsletterPage()), title: "Home" });

    expect(vercelStegaDecode(home.related.layout[0]?.items[1]?.label ?? "")).toEqual({
      ...inPage,
      docId: "B",
      key: "layout.cards-1.items.item-2.label",
      path: "layout.0.items.1.label",
    });
  });

  it("marks the populated document as it is marked when read on its own", () => {
    const home = readAsDraft({ id: "A", related: readAsDraft(newsletterPage()), title: "Home" });
    const newsletter = readAsDraft(newsletterPage());

    expect(markedTextsIn(home.related)).toEqual(markedTextsIn(newsletter));
    expect(markedTextsIn(newsletter)).toHaveLength(4);
  });

  it("resolves a document populated inside a row against itself", () => {
    const home = readAsDraft({
      id: "A",
      layout: [
        { blockType: "signup", id: "signup-1", title: "Newsletter" },
        {
          blockType: "cards",
          id: "cards-9",
          related: readAsDraft(newsletterPage()),
          title: "More",
        },
      ],
      title: "Home",
    });

    expect(markedTextsIn(home.layout[1]?.related)).toEqual(
      markedTextsIn(readAsDraft(newsletterPage()))
    );
    expect(vercelStegaDecode(home.layout[1]?.title ?? "")).toEqual({
      ...inPage,
      docId: "A",
      key: "layout.cards-9.title",
      path: "layout.1.title",
    });
  });
});

const header = () => ({
  id: "H",
  navItems: [{ id: "nav-1", label: "Pricing" }],
  title: "Main menu",
});

describe("a populated document of a collection the plugin does not mark", () => {
  it("gets no marker as a field of the document that relates to it", () => {
    const home = readAsDraft({ header: header(), id: "A", title: "Home" });

    expect(markedTextsIn(home.header)).toEqual([]);
    expect(home.header.navItems).toEqual([{ id: "nav-1", label: "Pricing" }]);
  });

  it("gets no marker as one of many related documents", () => {
    const home = readAsDraft({ footers: [header(), header()], id: "A", title: "Home" });

    expect(markedTextsIn(home.footers)).toEqual([]);
  });

  it("gets no marker behind a relationship to several collections", () => {
    const home = readAsDraft({
      banner: { relationTo: "headers", value: header() },
      id: "A",
      title: "Home",
    });

    expect(markedTextsIn(home.banner)).toEqual([]);
    expect(home.banner.value.navItems).toEqual([{ id: "nav-1", label: "Pricing" }]);
  });

  it("still addresses the relationship field of the document that relates to it", () => {
    const home = readAsDraft({ header: header(), id: "A", title: "Home" });

    expect(home.header).toMatchObject({
      _meta: { ...inPage, docId: "A", path: "header", terminal: true },
    });
  });
});

describe("a value the schema of its own holder does not make editable", () => {
  it("is not marked as the top-level field of the same name when it is a select in a row", () => {
    const page = readAsDraft({
      id: "A",
      layout: [{ blockType: "signup", id: "signup-1", note: "Read only", title: "Newsletter" }],
      note: "Editable",
      title: "Home",
    });

    expect(page.layout[0]).toEqual({
      blockType: "signup",
      id: "signup-1",
      note: "Read only",
      title: "Newsletter",
    });
    expect(markedTextsIn(page).map(({ text }) => text)).toEqual(["Editable", "Home"]);
  });

  it("is not marked when it sits in a group that is excluded", () => {
    const page = readAsDraft({ id: "A", internal: { title: "Secret" }, title: "Home" });

    expect(page.internal).toEqual({ title: "Secret" });
  });

  it("is not marked in a row of a block the schema does not know", () => {
    const page = readAsDraft({
      id: "A",
      layout: [{ blockType: "legacy", id: "row-1", title: "Old" }],
    });

    expect(page.layout[0]).toEqual({ blockType: "legacy", id: "row-1", title: "Old" });
  });
});

describe("a document read on its own", () => {
  it("keeps the markers it had", () => {
    const page = readAsDraft({
      id: "A",
      layout: [
        {
          blockType: "cards",
          id: "cards-1",
          items: [{ id: "item-1", label: "Monthly" }],
          title: "Cards",
        },
      ],
      list: [{ id: "row-1", label: "First" }, { label: "Second" }],
      title: "Home",
    });
    const ofPageA = { ...inPage, docId: "A" };

    expect(markedTextsIn(page)).toEqual([
      {
        marker: {
          ...ofPageA,
          key: "layout.cards-1.items.item-1.label",
          path: "layout.0.items.0.label",
        },
        text: "Monthly",
      },
      {
        marker: { ...ofPageA, key: "layout.cards-1.title", path: "layout.0.title" },
        text: "Cards",
      },
      { marker: { ...ofPageA, key: "list.row-1.label", path: "list.0.label" }, text: "First" },
      { marker: { ...ofPageA, path: "list.1.label" }, text: "Second" },
      { marker: { ...ofPageA, path: "title" }, text: "Home" },
    ]);
  });
});

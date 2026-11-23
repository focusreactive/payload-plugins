import type { FormState } from "payload";

import { vercelStegaCombine, vercelStegaDecode } from "@vercel/stega";
import { describe, expect, it } from "vitest";

import type { VeIdentity } from "../../src/shared/shared";
import type { PlainObject } from "../../src/shared/plainObject";

import { createPreviewSession } from "../../src/admin/instantPreview/previewSession";
import { markRead } from "../../src/server/markRead";
import { VE_FIELD_SNAPSHOT_TYPE, VE_FIELDS_RENDERED_TYPE } from "../../src/shared/protocol";
import { fromStegaPayload, META_KEY, toStegaPayload } from "../../src/shared/shared";

const pagesSchema = {
  body: "richText",
  layout: {
    cards: { items: { caption: "text" } },
    hero: { cta: { label: "text" }, heading: "text", intro: "richText" },
  },
  related: "relationship",
  title: "text",
};

const pageInfo = { collectionSlug: "pages", docId: "page-1", kind: "collection" } as const;

const markDraftRead = <T extends PlainObject>(
  doc: T,
  identity: Omit<VeIdentity, "path"> = pageInfo,
  instantPreview = true
): T => markRead(doc, { identity, instantPreview, schema: pagesSchema });

const markerOf = (text: unknown) => fromStegaPayload(vercelStegaDecode(String(text)));

type Card = { caption: string; id: string };

type Block = { blockType: string; heading?: string; id: unknown; items?: Card[] };

const hero = (id: unknown, heading: string): Block => ({ blockType: "hero", heading, id });

const cards = (id: string, items: Card[]): Block => ({ blockType: "cards", id, items });

describe("the stable key in a marker", () => {
  it("is left out for a field outside any row, where the path is the key", () => {
    const page = markDraftRead({ title: "Home" });

    expect(markerOf(page.title)).toEqual({ ...pageInfo, path: "title" });
  });

  it("replaces the index of a block with its row id", () => {
    const page = markDraftRead({ layout: [hero("row-a", "First"), hero("row-b", "Second")] });

    expect(markerOf(page.layout[1]?.heading)).toEqual({
      ...pageInfo,
      key: "layout.row-b.heading",
      path: "layout.1.heading",
    });
  });

  it("replaces the index at every level of nested rows", () => {
    const page = markDraftRead({
      layout: [
        hero("row-a", "First"),
        cards("row-b", [
          { caption: "One", id: "item-x" },
          { caption: "Two", id: "item-y" },
        ]),
      ],
    });

    expect(markerOf(page.layout[1]?.items?.[1]?.caption)).toMatchObject({
      key: "layout.row-b.items.item-y.caption",
      path: "layout.1.items.1.caption",
    });
  });

  it("reaches a field in a group inside a row", () => {
    const page = markDraftRead({
      layout: [{ ...hero("row-a", "First"), cta: { label: "Read more" } }],
    });

    expect(markerOf(page.layout[0]?.cta.label)).toMatchObject({
      key: "layout.row-a.cta.label",
      path: "layout.0.cta.label",
    });
  });

  it("stays the same when the row is saved at another index", () => {
    const before = markDraftRead({ layout: [hero("row-a", "First"), hero("row-b", "Second")] });
    const after = markDraftRead({ layout: [hero("row-b", "Second"), hero("row-a", "First")] });

    expect(markerOf(before.layout[0]?.heading)).toMatchObject({
      key: "layout.row-a.heading",
      path: "layout.0.heading",
    });
    expect(markerOf(after.layout[1]?.heading)).toMatchObject({
      key: "layout.row-a.heading",
      path: "layout.1.heading",
    });
  });

  it("is written from a numeric row id as text", () => {
    const page = markDraftRead({ layout: [hero(42, "First")] });

    expect(markerOf(page.layout[0]?.heading)?.key).toBe("layout.42.heading");
  });

  it("is stated for a row whose id reads like its index", () => {
    const page = markDraftRead({ layout: [hero("0", "First"), hero(1, "Second")] });

    expect(markerOf(page.layout[0]?.heading)?.key).toBe("layout.0.heading");
    expect(markerOf(page.layout[1]?.heading)?.key).toBe("layout.1.heading");
  });

  it("is left out when a row has no id to be known by", () => {
    const page = markDraftRead({ layout: [{ blockType: "hero", heading: "First" }] });

    expect(markerOf(page.layout[0]?.heading)).toEqual({
      ...pageInfo,
      path: "layout.0.heading",
    });
  });

  it("is left out when a row id would read as two path segments", () => {
    const page = markDraftRead({ layout: [hero("row.a", "First")] });

    expect(markerOf(page.layout[0]?.heading)).not.toHaveProperty("key");
  });

  it("is the key the admin computes for the same field of the form", () => {
    const layout = () => [
      hero("row-a", "First"),
      cards("row-b", [{ caption: "One", id: "item-x" }]),
    ];
    const key = markerOf(markDraftRead({ layout: layout() }).layout[1]?.items?.[0]?.caption)?.key;
    const formState: FormState = {
      layout: {
        rows: [
          { blockType: "hero", id: "row-a" },
          { blockType: "cards", id: "row-b" },
        ],
      },
      "layout.1.items": { rows: [{ id: "item-x" }] },
      "layout.1.items.0.caption": { value: "One" },
    };
    const session = createPreviewSession();
    session.formChanged({
      document: pageInfo,
      editableSchema: pagesSchema,
      formState,
      savedDocument: { layout: layout() },
    });

    expect(
      session.pageAnnounced({
        pageId: "page-load-1",
        rendered: [{ ...pageInfo, keys: [key] }],
        type: VE_FIELDS_RENDERED_TYPE,
      })
    ).toEqual([
      { type: VE_FIELD_SNAPSHOT_TYPE, ...pageInfo, fields: [{ key, saved: "One", value: "One" }] },
    ]);
  });

  it("works for a global, which has no document id", () => {
    const nav = markDraftRead(
      { layout: [hero("row-a", "First")] },
      { collectionSlug: "nav", kind: "global" }
    );

    expect(markerOf(nav.layout[0]?.heading)).toEqual({
      collectionSlug: "nav",
      key: "layout.row-a.heading",
      kind: "global",
      path: "layout.0.heading",
    });
  });

  it("does not reach the element attributes of rich text", () => {
    const page = markDraftRead({
      layout: [{ ...hero("row-a", "First"), intro: { root: { children: [], type: "root" } } }],
    });

    expect(page.layout[0]?.intro).toHaveProperty(META_KEY, {
      ...pageInfo,
      key: "layout.row-a.intro",
      path: "layout.0.intro",
      terminal: true,
    });
  });
});

describe("fromStegaPayload", () => {
  const decode = (payload: object) =>
    fromStegaPayload(vercelStegaDecode(vercelStegaCombine("Text", payload, false)));

  it("reads a marker written with the names of its properties", () => {
    const identity = { ...pageInfo, key: "layout.row-a.heading", path: "layout.0.heading" };

    expect(decode(identity)).toEqual(identity);
  });

  it("reads a marker written before markers had a key", () => {
    expect(decode({ ...pageInfo, path: "layout.0.heading" })).toEqual({
      ...pageInfo,
      path: "layout.0.heading",
    });
  });

  it("ignores a key that is not text", () => {
    expect(decode({ ...pageInfo, key: 7, path: "title" })).toEqual({ ...pageInfo, path: "title" });
  });
});

const lengthOf = (payload: unknown) => JSON.stringify(payload).length;

describe("the payload of a marker", () => {
  const ROW_ID = "6a20bc9034cce4ea2150357d";
  const NESTED_ROW_ID = "6acf5454aa3fbd18af4f5db8";

  const fieldInRows: VeIdentity = {
    ...pageInfo,
    key: `layout.${ROW_ID}.items.${NESTED_ROW_ID}.caption`,
    path: "layout.0.items.3.caption",
  };

  it.each<[string, VeIdentity]>([
    ["a field outside any row", { ...pageInfo, path: "title" }],
    ["a field in nested rows", fieldInRows],
    ["a field of a global", { collectionSlug: "settings", kind: "global", path: "title" }],
    [
      "a row of a global",
      {
        collectionSlug: "settings",
        key: "links.row-a.label",
        kind: "global",
        path: "links.0.label",
      },
    ],
    ["a value of one locale", { ...pageInfo, locale: "de", path: "title" }],
    [
      "a row whose id reads like its index",
      { ...pageInfo, key: "layout.0.heading", path: "layout.0.heading" },
    ],
    [
      "a key that names other fields than the path",
      { ...pageInfo, key: "layout.row-a", path: "layout.0.heading" },
    ],
    ["a field named like an index", { ...pageInfo, key: "layout.row-a.0", path: "layout.0.0" }],
    ["a field of several lines", { ...pageInfo, multiline: true, path: "summary" }],
    [
      "a field of several lines of one locale in a row",
      {
        ...pageInfo,
        key: "layout.row-a.body",
        locale: "de",
        multiline: true,
        path: "layout.0.body",
      },
    ],
  ])("is read back as the identity it was written from for %s", (_name, identity) => {
    expect(fromStegaPayload(toStegaPayload(identity))).toEqual(identity);
  });

  it("states the row ids once and the names of the document properties never", () => {
    const payload = toStegaPayload(fieldInRows);

    expect(payload).toEqual([
      0,
      "pages",
      "page-1",
      "layout.0.items.3.caption",
      [ROW_ID, NESTED_ROW_ID],
    ]);
    expect(lengthOf(payload)).toBeLessThan(lengthOf(fieldInRows) * (2 / 3));
  });

  it("ends at the path for a field outside any row", () => {
    expect(toStegaPayload({ ...pageInfo, path: "title" })).toEqual([0, "pages", "page-1", "title"]);
  });

  it("says that a field holds several lines in one more entry, and that a field of one line does not in none", () => {
    expect(toStegaPayload({ ...pageInfo, multiline: true, path: "summary" })).toEqual([
      0,
      "pages",
      "page-1",
      "summary",
      0,
      0,
      1,
    ]);
    expect(toStegaPayload({ ...pageInfo, path: "title" })).toHaveLength(4);
  });

  it("is written into the text of a draft read", () => {
    const page = markDraftRead({ layout: [hero("row-a", "First")] });

    expect(vercelStegaDecode(page.layout[0]?.heading ?? "")).toEqual(
      toStegaPayload({ ...pageInfo, key: "layout.row-a.heading", path: "layout.0.heading" })
    );
  });

  it.each([[[]], [[0, "pages"]], [[7, "pages", "page-1", "title"]], [[0, "pages", "page-1", 7]]])(
    "is no marker of a field when it is %j",
    (payload) => {
      expect(fromStegaPayload(payload)).toBeNull();
    }
  );
});

describe("a draft read without instant preview", () => {
  it("marks a field in a row with its path alone", () => {
    const page = markDraftRead({ layout: [hero("row-a", "First")] }, pageInfo, false);

    expect(markerOf(page.layout[0]?.heading)).toEqual({
      ...pageInfo,
      path: "layout.0.heading",
    });
  });
});

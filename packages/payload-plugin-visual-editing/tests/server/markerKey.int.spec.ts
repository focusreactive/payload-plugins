import type { FormState } from "payload";

import { vercelStegaCombine, vercelStegaDecode } from "@vercel/stega";
import { describe, expect, it } from "vitest";

import type { VeIdentity } from "../../src/shared/shared";
import type { PlainObject } from "../../src/shared/plainObject";

import { createPreviewSession } from "../../src/admin/instantPreview/previewSession";
import { markRead } from "../../src/server/markRead";
import { VE_FIELD_SNAPSHOT_TYPE, VE_FIELDS_RENDERED_TYPE } from "../../src/shared/protocol";
import { fromStegaPayload, META_KEY } from "../../src/shared/shared";

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

    expect(vercelStegaDecode(page.title)).toEqual({ ...pageInfo, path: "title" });
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

    expect(vercelStegaDecode(page.layout[0]?.heading ?? "")).toEqual({
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

describe("a draft read without instant preview", () => {
  it("marks a field in a row with its path alone", () => {
    const page = markDraftRead({ layout: [hero("row-a", "First")] }, pageInfo, false);

    expect(vercelStegaDecode(page.layout[0]?.heading ?? "")).toEqual({
      ...pageInfo,
      path: "layout.0.heading",
    });
  });
});

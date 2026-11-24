import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Block, CollectionConfig } from "payload";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

/*
 * Every container in the shared fixture sits directly under the collection root and holds exactly
 * one localized leaf. Two shapes therefore reach the walker here for the first time: a container
 * inside a container with text at both depths, and one list row holding two localized leaves.
 */
const inner: Block = {
  slug: "inner",
  fields: [{ name: "caption", type: "text", localized: true }],
};

const outer: Block = {
  slug: "outer",
  fields: [
    { name: "heading", type: "text", localized: true },
    { name: "children", type: "blocks", blocks: [inner] },
  ],
};

const docs: CollectionConfig = {
  slug: "docs",
  fields: [
    { name: "title", type: "text", localized: true },
    { name: "sections", type: "blocks", blocks: [outer] },
    {
      name: "rows",
      type: "array",
      fields: [
        { name: "label", type: "text", localized: true },
        { name: "note", type: "text", localized: true },
      ],
    },
  ],
};

type Node =
  | { kind: "leaf"; address: string }
  | { kind: "group"; children: Node[] }
  | { kind: "whole-list"; addresses: string[] };

type State = { tree: Node[] };

const addressesOf = (nodes: readonly Node[]): string[] =>
  nodes.flatMap((node) => {
    if (node.kind === "group") return addressesOf(node.children);
    if (node.kind === "whole-list") return node.addresses;
    return [node.address];
  });

type Section = { heading?: string; children?: { caption?: string }[] };
type Row = { label?: string; note?: string };
type Doc = { title?: string; sections?: Section[]; rows?: Row[] };

describe("shapes no fixture in the suite had", () => {
  let ctx: TestPayload;
  let id: string;

  beforeAll(async () => {
    ctx = await bootTestPayload({ collections: [{ slug: "users", auth: true, fields: [] }, docs] });
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: {
        title: "A title",
        sections: [
          {
            blockType: "outer",
            heading: "Outer heading",
            children: [{ blockType: "inner", caption: "Inner caption" }],
          },
        ],
        rows: [{ label: "Row label", note: "Row note" }],
      },
    });
    id = String(made.id);

    const res = await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: ["de"],
        collection_slug: "docs",
        collection_id: [id],
        publish_on_translation: false,
      },
    });
    expect(res.status, "the run must be admitted before anything is read back").toBe(200);
  });

  afterAll(async () => {
    await ctx?.cleanup();
  });

  const german = async (): Promise<Doc> =>
    (await ctx.payload.findByID({ collection: "docs", id, locale: "de" })) as Doc;

  it("translates text at both depths of a block inside a block", async () => {
    const doc = await german();

    expect({
      outer: doc.sections?.[0]?.heading,
      inner: doc.sections?.[0]?.children?.[0]?.caption,
    }).toStrictEqual({ outer: "de:Outer heading", inner: "de:Inner caption" });
  });

  it("offers the nested leaf to a field picker, not only the outer one", async () => {
    const res = await callEndpoint(
      ctx.payload,
      "get",
      "/translate/document-state/:collection_slug/:collection_id",
      { routeParams: { collection_slug: "docs", collection_id: id } }
    );

    expect(res.status).toBe(200);
    expect(
      addressesOf((res.data as { data: State }).data.tree),
      "the title, both depths of the block, and both leaves of the row"
    ).toHaveLength(5);
  });

  it("translates both localized leaves of one list row", async () => {
    const doc = await german();

    expect({ label: doc.rows?.[0]?.label, note: doc.rows?.[0]?.note }).toStrictEqual({
      label: "de:Row label",
      note: "de:Row note",
    });
  });
});

import type { Block, CollectionConfig } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

// No self-referencing block: @payloadcms/drizzle 3.90 overflows the stack building its tables (seen on
// SQLite); projectFieldLike.blockReferences.test.ts covers that case.

const tr = (locale: string, s: string) => `${locale}:${s}`;

const sharedBlocks: Block[] = [
  {
    slug: "hero",
    fields: [{ name: "heading", type: "text", localized: true }],
  },
  {
    slug: "section",
    fields: [
      { name: "title", type: "text", localized: true },
      { name: "children", type: "blocks", blocks: [], blockReferences: ["hero"] },
    ],
  },
];

const collections: CollectionConfig[] = [
  { slug: "users", auth: true, fields: [] },
  {
    slug: "docs",
    versions: { drafts: true },
    fields: [
      {
        name: "sections",
        type: "blocks",
        blocks: [],
        blockReferences: ["hero", "section"],
      },
      // Kept apart from `sections`: Payload 3.90's `mergeLocalizedData` (per-locale publish) resolves every
      // element by the last `blockReferences` entry alone, so mixing slugs and Block objects loses localized text.
      {
        name: "callouts",
        type: "blocks",
        blocks: [],
        blockReferences: [
          { slug: "cta", fields: [{ name: "caption", type: "text", localized: true }] },
        ],
      },
    ],
  },
];

type Section = {
  blockType: string;
  heading?: string;
  title?: string;
  caption?: string;
  children?: Section[];
};

describe("blocks wired by blockReferences", () => {
  let ctx: TestPayload;

  beforeAll(async () => {
    ctx = await bootTestPayload({ collections, blocks: sharedBlocks });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("translates every referenced section, nested ones included", async () => {
    const created = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: {
        _status: "published",
        sections: [
          { blockType: "hero", heading: "Welcome" },
          {
            blockType: "section",
            title: "Outer",
            children: [{ blockType: "hero", heading: "Nested hero" }],
          },
        ],
        callouts: [{ blockType: "cta", caption: "Buy now" }],
      },
    });
    const id = String(created.id);

    await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: "de",
        collection_slug: "docs",
        collection_id: [id],
        strategy: "overwrite",
        publish_on_translation: true,
      },
    });

    const de = await ctx.payload.findByID({ collection: "docs", id, locale: "de" });
    const [hero, section] = de.sections as Section[];
    const [cta] = de.callouts as Section[];
    expect(hero.heading).toBe(tr("de", "Welcome"));
    expect(section.title).toBe(tr("de", "Outer"));
    expect(section.children?.[0].heading).toBe(tr("de", "Nested hero"));
    expect(cta.caption).toBe(tr("de", "Buy now"));
  });
});

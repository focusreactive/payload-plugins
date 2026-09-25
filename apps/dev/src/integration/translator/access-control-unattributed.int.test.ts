import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CollectionConfig } from "payload";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { buildTestCollections } from "./testCollections";

// Its own file: `getPayload` caches per process, so a second boot in one spec returns the first.

let ctx: TestPayload;

const restricted = (collections: CollectionConfig[]): CollectionConfig[] =>
  collections.map((c) =>
    c.slug === "docs"
      ? ({ ...c, access: { ...(c.access ?? {}), update: () => false } } as CollectionConfig)
      : c
  );

describe("a save that carried no identity keeps translating", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      collections: restricted(buildTestCollections()),
      autoTranslate: { targets: ["de"] },
    });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  // The host's own server-side code writes with no user. It was trusted before this change and stays
  // trusted; the same rule covers jobs queued before the requester was recorded.
  it("translates into a refusing collection, because there is nobody to refuse", async () => {
    const created = await ctx.payload.create({
      collection: "docs" as "pages",
      locale: "en",
      data: { title: "Server side", _status: "published" } as never,
    });

    const doc = await ctx.payload.findByID({
      collection: "docs" as "pages",
      id: created.id,
      locale: "de",
    });
    expect((doc as { title?: string }).title).toBe("de:Server side");
  });
});

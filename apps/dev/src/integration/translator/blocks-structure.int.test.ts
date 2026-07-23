import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

// Blocks are the sensitive structural part. `sections` is a NON-localized blocks container with
// localized leaves — the recommended regime: block rows are SHARED across locales, paired by `id`
// (not position) and re-emitted in SOURCE order. These specs pin that contract through the real
// pipeline: same-type blocks each get their OWN translation, reordering the source re-mirrors order
// without cross-contaminating leaves or corrupting an already-translated locale, and skip_existing
// respects per-block edits — matched by id even when only some blocks are filled ("partially differ").

const rev = (s: string) => [...s].reverse().join("");

type Block = { id?: string; blockType: string; heading?: string; caption?: string };

const enqueue = (
  ctx: TestPayload,
  id: string,
  target: string,
  strategy: "overwrite" | "skip_existing" = "overwrite"
) =>
  callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: target,
      collection_slug: "docs",
      collection_id: [id],
      strategy,
      publish_on_translation: true,
    },
  });

const sectionsOf = async (ctx: TestPayload, id: string, locale: string): Promise<Block[]> => {
  const doc = await ctx.payload.findByID({ collection: "docs", id, locale });
  return doc.sections as Block[];
};

describe("blocks — id-based pairing, ordering, partial differences", () => {
  let ctx: TestPayload;

  beforeAll(async () => {
    ctx = await bootTestPayload();
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("gives each same-type block its OWN translation (no positional cross-contamination)", async () => {
    // Three hero blocks with distinct headings — a naive positional pairing could shuffle them.
    const created = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: {
        _status: "published",
        sections: [
          { blockType: "hero", heading: "Alpha" },
          { blockType: "hero", heading: "Bravo" },
          { blockType: "hero", heading: "Charlie" },
        ],
      },
    });
    const id = String(created.id);
    await enqueue(ctx, id, "de");

    const de = await sectionsOf(ctx, id, "de");
    expect(de.map((b) => b.heading)).toEqual([rev("Alpha"), rev("Bravo"), rev("Charlie")]);
  });

  it("re-mirrors SOURCE order on reorder+edit, without corrupting an already-translated locale", async () => {
    const created = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: {
        _status: "published",
        sections: [
          { blockType: "hero", heading: "One" },
          { blockType: "cta", caption: "Two" },
          { blockType: "hero", heading: "Three" },
        ],
      },
    });
    const id = String(created.id);
    // Translate BOTH targets first.
    await enqueue(ctx, id, "de");
    await enqueue(ctx, id, "fr");

    // Reorder the shared block rows at source (keep ids) and edit one leaf → [Three, One*, Two].
    const en = await sectionsOf(ctx, id, "en");
    const byHead = (h: string) => en.find((b) => b.heading === h || b.caption === h)!;
    const three = byHead("Three");
    const one = byHead("One");
    const two = byHead("Two");
    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "en",
      data: {
        _status: "published",
        sections: [
          { id: three.id, blockType: "hero", heading: "Three" },
          { id: one.id, blockType: "hero", heading: "One EDITED" },
          { id: two.id, blockType: "cta", caption: "Two" },
        ],
      },
    });
    // Re-translate only DE.
    await enqueue(ctx, id, "de");

    // DE follows the new source order, with the edited leaf re-translated and each block by its id.
    const de = await sectionsOf(ctx, id, "de");
    expect(de.map((b) => b.id)).toEqual([three.id, one.id, two.id]); // ids stable, reordered
    expect(de.map((b) => b.heading ?? b.caption)).toEqual([
      rev("Three"),
      rev("One EDITED"),
      rev("Two"),
    ]);

    // Source survives the reorder+re-translate.
    const enAfter = await sectionsOf(ctx, id, "en");
    expect(enAfter.map((b) => b.heading ?? b.caption)).toEqual(["Three", "One EDITED", "Two"]);

    // FR was NOT re-translated: its rows are shared, so they reorder with the source, but its
    // previously-translated leaves are intact (not wiped by the DE pass) — old "One" translation kept.
    const fr = await sectionsOf(ctx, id, "fr");
    expect(fr.map((b) => b.id)).toEqual([three.id, one.id, two.id]);
    expect(fr.map((b) => b.heading ?? b.caption)).toEqual([rev("Three"), rev("One"), rev("Two")]);
  });

  it("skip_existing fills empty block leaves but keeps a manually-edited one (matched by id)", async () => {
    const created = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: {
        _status: "published",
        sections: [
          { blockType: "hero", heading: "Src A" },
          { blockType: "hero", heading: "Src B" },
          { blockType: "hero", heading: "Src C" },
        ],
      },
    });
    const id = String(created.id);
    const en = await sectionsOf(ctx, id, "en");

    // Manually set ONLY the middle block's DE leaf (by id); leave the other two empty.
    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "de",
      data: {
        _status: "published",
        sections: [
          { id: en[0].id, blockType: "hero" },
          { id: en[1].id, blockType: "hero", heading: "MANUAL B" },
          { id: en[2].id, blockType: "hero" },
        ],
      },
    });

    await enqueue(ctx, id, "de", "skip_existing");

    const de = await sectionsOf(ctx, id, "de");
    // Empty siblings filled from source; the manually-edited middle block kept — paired by id.
    expect(de.map((b) => b.heading)).toEqual([rev("Src A"), "MANUAL B", rev("Src C")]);
  });
});

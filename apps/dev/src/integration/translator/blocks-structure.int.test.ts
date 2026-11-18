import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

// Blocks are the sensitive structural part. `sections` is a NON-localized blocks container with
// localized leaves — the recommended regime: block rows are SHARED across locales, paired by `id`
// (not position) and re-emitted in SOURCE order. These specs pin that contract through the real
// pipeline: same-type blocks each get their OWN translation, reordering the source re-mirrors order
// without cross-contaminating leaves or corrupting an already-translated locale, and a filter
// naming one block's leaf leaves its siblings' target text where it stands — paired by id.

const tr = (locale: string, s: string) => (s.trim() ? `${locale}:${s}` : s);

type Block = { id?: string; blockType: string; heading?: string; caption?: string };

const filtersFrom = (rules?: string[], addresses?: string[]) => [
  ...(rules ?? []).map((name) => ({ kind: "rule", name })),
  ...(addresses ? [{ kind: "leaves", addresses }] : []),
];

const enqueue = (
  ctx: TestPayload,
  id: string,
  target: string,
  rules?: string[],
  addresses?: string[]
) =>
  callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: target,
      collection_slug: "docs",
      collection_id: [id],
      filters: filtersFrom(rules, addresses),
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
    expect(de.map((b) => b.heading)).toEqual([
      tr("de", "Alpha"),
      tr("de", "Bravo"),
      tr("de", "Charlie"),
    ]);
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
      tr("de", "Three"),
      tr("de", "One EDITED"),
      tr("de", "Two"),
    ]);

    // Source survives the reorder+re-translate.
    const enAfter = await sectionsOf(ctx, id, "en");
    expect(enAfter.map((b) => b.heading ?? b.caption)).toEqual(["Three", "One EDITED", "Two"]);

    // FR was NOT re-translated: its rows are shared, so they reorder with the source, but its
    // previously-translated leaves are intact (not wiped by the DE pass) — old "One" translation kept.
    const fr = await sectionsOf(ctx, id, "fr");
    expect(fr.map((b) => b.id)).toEqual([three.id, one.id, two.id]);
    expect(fr.map((b) => b.heading ?? b.caption)).toEqual([
      tr("fr", "Three"),
      tr("fr", "One"),
      tr("fr", "Two"),
    ]);
  });

  it("pairs blocks by id when a run takes every leaf, keeping their order", async () => {
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

    await enqueue(ctx, id, "de");

    const de = await sectionsOf(ctx, id, "de");
    expect(de.map((b) => b.heading)).toEqual([
      tr("de", "Src A"),
      tr("de", "Src B"),
      tr("de", "Src C"),
    ]);
  });

  it("sends one block's leaf and leaves its siblings' target text alone", async () => {
    const created = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: {
        _status: "published",
        title: "Selected block",
        sections: [
          { blockType: "hero", heading: "Src A" },
          { blockType: "hero", heading: "Src B" },
        ],
      },
    });
    const id = String(created.id);
    const en = await sectionsOf(ctx, id, "en");

    await enqueue(ctx, id, "de");
    const first = await sectionsOf(ctx, id, "de");
    expect(first.map((b) => b.heading)).toEqual([tr("de", "Src A"), tr("de", "Src B")]);

    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "en",
      data: {
        _status: "published",
        sections: [
          { id: en[0].id, blockType: "hero", heading: "Src A, edited" },
          { id: en[1].id, blockType: "hero", heading: "Src B, edited" },
        ],
      },
    });

    await enqueue(ctx, id, "de", undefined, [`sections.${en[1].id}:hero.heading`]);

    const de = await sectionsOf(ctx, id, "de");
    expect(de[0]?.heading, "its address was not named").toBe(tr("de", "Src A"));
    expect(de[1]?.heading, "named by its own id, not its position").toBe(tr("de", "Src B, edited"));
  });
});

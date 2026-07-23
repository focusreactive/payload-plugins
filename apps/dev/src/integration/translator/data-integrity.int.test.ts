import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

// THE most important contract: translation must never RUIN data — never delete, never overwrite where
// it must not. This locks the c0a49d1b critical bug (fix PR #69): for a NON-localized blocks/array
// container the rows are SHARED across locales; stripping their `id` made `update({ locale })` fail to
// match, so Payload deleted + recreated the rows and WIPED every other locale's values — including the
// source. The fix keeps `id` on shared rows. These specs exercise the exact failure modes end-to-end:
//   1. translating a SECOND locale must not wipe the FIRST (the original repro),
//   2. block/array ids stay stable (no delete+recreate),
//   3. non-localized data inside a shared row survives in every locale,
//   4. re-translating the same locale is non-destructive.

const rev = (s: string) => [...s].reverse().join("");

type Block = {
  id?: string;
  blockType: string;
  heading?: string;
  caption?: string;
  anchor?: string;
};
type Item = { id?: string; label?: string; code?: string };

const EN = {
  _status: "published" as const,
  title: "Doc title",
  items: [
    { label: "Item one", code: "C1" },
    { label: "Item two", code: "C2" },
  ],
  sections: [
    { blockType: "hero", heading: "Hero one", anchor: "top" },
    { blockType: "cta", caption: "Cta two" },
    { blockType: "hero", heading: "Hero three", anchor: "bottom" },
  ],
};

const enqueue = (ctx: TestPayload, id: string, target: string) =>
  callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: target,
      collection_slug: "docs",
      collection_id: [id],
      strategy: "overwrite",
      publish_on_translation: true,
    },
  });

const read = (ctx: TestPayload, id: string, locale: string) =>
  ctx.payload.findByID({ collection: "docs", id, locale });

describe("data integrity — translation never destroys content", () => {
  let ctx: TestPayload;

  beforeAll(async () => {
    ctx = await bootTestPayload();
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("translating a SECOND locale does NOT wipe the FIRST (the c0a49d1b repro)", async () => {
    const created = await ctx.payload.create({ collection: "docs", locale: "en", data: EN });
    const id = String(created.id);

    await enqueue(ctx, id, "de");
    // DE is fully populated before the FR pass.
    const deBefore = await read(ctx, id, "de");
    expect((deBefore.sections as Block[]).map((b) => b.heading ?? b.caption)).toEqual([
      rev("Hero one"),
      rev("Cta two"),
      rev("Hero three"),
    ]);
    expect((deBefore.items as Item[]).map((i) => i.label)).toEqual([
      rev("Item one"),
      rev("Item two"),
    ]);

    // Translate a second locale — this is what deleted+recreated the shared rows under the bug.
    await enqueue(ctx, id, "fr");

    // DE must be UNCHANGED (the bug wiped it here).
    const de = await read(ctx, id, "de");
    expect((de.sections as Block[]).map((b) => b.heading ?? b.caption)).toEqual([
      rev("Hero one"),
      rev("Cta two"),
      rev("Hero three"),
    ]);
    expect((de.items as Item[]).map((i) => i.label)).toEqual([rev("Item one"), rev("Item two")]);

    // Source (EN) intact; FR populated.
    const en = await read(ctx, id, "en");
    expect((en.sections as Block[]).map((b) => b.heading ?? b.caption)).toEqual([
      "Hero one",
      "Cta two",
      "Hero three",
    ]);
    const fr = await read(ctx, id, "fr");
    expect((fr.items as Item[]).map((i) => i.label)).toEqual([rev("Item one"), rev("Item two")]);
  });

  it("keeps block/array ids stable across translation (in-place update, no recreate)", async () => {
    const created = await ctx.payload.create({ collection: "docs", locale: "en", data: EN });
    const id = String(created.id);

    const before = await read(ctx, id, "en");
    const blockIds = (before.sections as Block[]).map((b) => b.id);
    const itemIds = (before.items as Item[]).map((i) => i.id);
    expect(blockIds.every(Boolean)).toBe(true);
    expect(itemIds.every(Boolean)).toBe(true);

    await enqueue(ctx, id, "de");
    await enqueue(ctx, id, "fr");

    // Shared rows updated in place → the SAME ids survive (a delete+recreate would change them).
    const after = await read(ctx, id, "en");
    expect((after.sections as Block[]).map((b) => b.id)).toEqual(blockIds);
    expect((after.items as Item[]).map((i) => i.id)).toEqual(itemIds);
    // And the target locale exposes the same shared-row ids.
    const de = await read(ctx, id, "de");
    expect((de.sections as Block[]).map((b) => b.id)).toEqual(blockIds);
  });

  it("preserves NON-localized data inside a shared row, in every locale", async () => {
    const created = await ctx.payload.create({ collection: "docs", locale: "en", data: EN });
    const id = String(created.id);

    await enqueue(ctx, id, "de");

    // Non-localized `anchor` (block) and `code` (array) are shared columns — untouched by translation
    // and identical across locales (never reversed, never dropped).
    for (const locale of ["en", "de"]) {
      const doc = await read(ctx, id, locale);
      const anchors = (doc.sections as Block[]).map((b) => b.anchor ?? null);
      expect(anchors).toEqual(["top", null, "bottom"]);
      expect((doc.items as Item[]).map((i) => i.code)).toEqual(["C1", "C2"]);
    }
  });

  it("re-translating the SAME locale is non-destructive and idempotent", async () => {
    const created = await ctx.payload.create({ collection: "docs", locale: "en", data: EN });
    const id = String(created.id);

    await enqueue(ctx, id, "de");
    const first = await read(ctx, id, "de");
    await enqueue(ctx, id, "de"); // run it again
    const second = await read(ctx, id, "de");

    // Same translated leaves, same shared-row ids, source still intact.
    expect((second.sections as Block[]).map((b) => b.heading ?? b.caption)).toEqual(
      (first.sections as Block[]).map((b) => b.heading ?? b.caption)
    );
    expect((second.sections as Block[]).map((b) => b.id)).toEqual(
      (first.sections as Block[]).map((b) => b.id)
    );
    const en = await read(ctx, id, "en");
    expect((en.items as Item[]).map((i) => i.label)).toEqual(["Item one", "Item two"]);
  });
});

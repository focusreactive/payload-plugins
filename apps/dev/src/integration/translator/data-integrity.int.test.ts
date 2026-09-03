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

const enqueue = (ctx: TestPayload, id: string, target: string, publish = true) =>
  callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: target,
      collection_slug: "docs",
      collection_id: [id],
      strategy: "overwrite",
      publish_on_translation: publish,
    },
  });

// `docs` is this spec's own fixture collection, so it is absent from the dev app's generated
// `payload-types`. Every cast that gap needs lives in these four helpers; nothing below casts.
type Doc = Record<string, unknown>;

const read = (ctx: TestPayload, id: string, locale: string) =>
  ctx.payload.findByID({
    collection: "docs" as "pages",
    id,
    locale: locale as "en",
  }) as unknown as Promise<Doc>;

const readDraft = (ctx: TestPayload, id: string, locale: string) =>
  ctx.payload.findByID({
    collection: "docs" as "pages",
    id,
    locale: locale as "en",
    draft: true,
  }) as unknown as Promise<Doc>;

const createDoc = async (ctx: TestPayload, data: Record<string, unknown>): Promise<string> => {
  const doc = await ctx.payload.create({
    collection: "docs" as "pages",
    locale: "en",
    data: data as never,
  });
  return String(doc.id);
};

const updateDraft = (ctx: TestPayload, id: string, data: Record<string, unknown>) =>
  ctx.payload.update({ collection: "docs" as "pages", id, locale: "en", draft: true, data });

describe("data integrity — translation never destroys content", () => {
  let ctx: TestPayload;

  beforeAll(async () => {
    ctx = await bootTestPayload();
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("translating a SECOND locale does NOT wipe the FIRST (the c0a49d1b repro)", async () => {
    const id = await createDoc(ctx, EN);

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
    const id = await createDoc(ctx, EN);

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
    // Everything above is an ABSENCE of change, which a run that translated nothing satisfies just
    // as well. The claim is "translated in place", so the run has to be shown doing the translating.
    expect((de.sections as Block[]).map((b) => b.heading ?? b.caption)).toEqual([
      rev("Hero one"),
      rev("Cta two"),
      rev("Hero three"),
    ]);
  });

  it("preserves NON-localized data inside a shared row, in every locale", async () => {
    const id = await createDoc(ctx, EN);

    await enqueue(ctx, id, "de");

    // Non-localized `anchor` (block) and `code` (array) are shared columns — untouched by translation
    // and identical across locales (never reversed, never dropped).
    for (const locale of ["en", "de"]) {
      const doc = await read(ctx, id, locale);
      const anchors = (doc.sections as Block[]).map((b) => b.anchor ?? null);
      expect(anchors).toEqual(["top", null, "bottom"]);
      expect((doc.items as Item[]).map((i) => i.code)).toEqual(["C1", "C2"]);
    }

    // The other half of the claim: the LOCALIZED siblings in those same rows were translated. Without
    // it the case says only "nothing changed", which is true of a run that did nothing.
    const de = await read(ctx, id, "de");
    expect((de.sections as Block[]).map((b) => b.heading ?? b.caption)).toEqual([
      rev("Hero one"),
      rev("Cta two"),
      rev("Hero three"),
    ]);
  });

  // #115. The reconciler is source-driven — it iterates the SOURCE list — so whatever the source read
  // misses is absent from the reconciled result, and the write then rewrites the draft from that
  // truncated shape. Reading the published row was therefore destructive in a way the issue
  // understates: the draft's own rows are replaced by the published ones, so the draft-only element
  // is deleted AND the source-locale text of the survivors goes with it — the editor reopens the
  // page and the list is blank. Cured by the source read taking the current version (`draft: true`).
  describe("the source draft differs structurally from the published row (#115)", () => {
    // Publish EN as the fixture, then give the draft a different shape. Returns the document id and
    // the draft's own row ids, which must survive: new ids mean delete+recreate, which is what
    // wiped the leaf values.
    const withDraftShape = async (sections: unknown[], items?: unknown[]) => {
      const id = await createDoc(ctx, EN);
      await updateDraft(ctx, id, items ? { sections, items } : { sections });
      const draft = await readDraft(ctx, id, "en");
      return { id, blockIds: (draft.sections as Block[]).map((b) => b.id) };
    };

    const headings = (doc: Record<string, unknown>) =>
      (doc.sections as Block[]).map((b) => b.heading ?? b.caption);

    it("keeps an element that exists only in the draft, and the survivors' source text", async () => {
      const { id, blockIds } = await withDraftShape(
        [...EN.sections, { blockType: "hero", heading: "Draft-only hero" }],
        [...EN.items, { label: "Draft-only item", code: "C3" }]
      );

      await enqueue(ctx, id, "de", false);

      const draft = await readDraft(ctx, id, "en");
      expect(headings(draft), "the draft-only block was deleted").toEqual([
        "Hero one",
        "Cta two",
        "Hero three",
        "Draft-only hero",
      ]);
      expect(
        (draft.items as Item[]).map((i) => i.label),
        "the draft-only item was deleted"
      ).toEqual(["Item one", "Item two", "Draft-only item"]);
      // The heart of it: the rows are the DRAFT's own, not the published ones swapped in. Asserting
      // the headings alone is not enough — under the defect they came back `undefined`, which is
      // how the source text was lost.
      expect(
        (draft.sections as Block[]).map((b) => b.id),
        "draft rows were replaced"
      ).toEqual(blockIds);

      // Positive control: "nothing was deleted" is also what a pipeline that did nothing produces.
      const de = await readDraft(ctx, id, "de");
      expect(headings(de)).toEqual([
        rev("Hero one"),
        rev("Cta two"),
        rev("Hero three"),
        rev("Draft-only hero"),
      ]);
    });

    it("does not resurrect an element the editor deleted in the draft", async () => {
      const { id } = await withDraftShape([EN.sections[0], EN.sections[2]]);

      await enqueue(ctx, id, "de", false);

      expect(headings(await readDraft(ctx, id, "en")), "a deleted block came back").toEqual([
        "Hero one",
        "Hero three",
      ]);
      expect(headings(await readDraft(ctx, id, "de"))).toEqual([
        rev("Hero one"),
        rev("Hero three"),
      ]);
    });

    it("keeps the draft's order, not the published one", async () => {
      const { id } = await withDraftShape([EN.sections[2], EN.sections[1], EN.sections[0]]);

      await enqueue(ctx, id, "de", false);

      expect(headings(await readDraft(ctx, id, "en")), "published order was restored").toEqual([
        "Hero three",
        "Cta two",
        "Hero one",
      ]);
      expect(headings(await readDraft(ctx, id, "de"))).toEqual([
        rev("Hero three"),
        rev("Cta two"),
        rev("Hero one"),
      ]);
    });

    // Publish mode reaches the draft through a second write, so it needs its own case. The
    // draft-only element going live is the documented trade-off, not an accident.
    it("in publish mode the draft-only element survives and goes live", async () => {
      const { id } = await withDraftShape([
        ...EN.sections,
        { blockType: "hero", heading: "Draft-only hero" },
      ]);

      await enqueue(ctx, id, "de", true);

      expect(headings(await readDraft(ctx, id, "en"))).toEqual([
        "Hero one",
        "Cta two",
        "Hero three",
        "Draft-only hero",
      ]);
      expect(headings(await read(ctx, id, "de")), "the locale did not go live").toEqual([
        rev("Hero one"),
        rev("Cta two"),
        rev("Hero three"),
        rev("Draft-only hero"),
      ]);
    });
  });

  it("re-translating the SAME locale is non-destructive and idempotent", async () => {
    const id = await createDoc(ctx, EN);

    await enqueue(ctx, id, "de");
    const first = await read(ctx, id, "de");
    // Pin what the first run PRODUCED before comparing the second to it: "both runs agree" is
    // satisfied by "both runs produced nothing".
    expect((first.sections as Block[]).map((b) => b.heading ?? b.caption)).toEqual([
      rev("Hero one"),
      rev("Cta two"),
      rev("Hero three"),
    ]);

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

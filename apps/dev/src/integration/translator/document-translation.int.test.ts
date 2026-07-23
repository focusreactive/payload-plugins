import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

// R3 — document translation happy path. Manual translation via the real `POST /translate/enqueue`
// endpoint (in-process), sync runner → translation runs inline. The dry-run provider reverses text
// (proven in _smoke), so every translated leaf must equal reverse(source). Fixture carries EVERY
// nesting container + a non-localized field, with >=2 blocks and >=2 array items so id reconciliation
// (the c0a49d1b failure mode) is exercised and the source-not-wiped lock is meaningful.

const rev = (s: string) => [...s].reverse().join("");

const EN = {
  _status: "published" as const,
  title: "Title source",
  ref: "REF-123", // non-localized — must be identical across locales, never reversed
  meta: { subtitle: "Subtitle source", sku: "SKU-9" /* sku non-localized */ },
  items: [{ label: "Item one" }, { label: "Item two" }], // >=2 array rows
  sections: [
    { blockType: "hero", heading: "Hero one" },
    { blockType: "cta", caption: "Cta text" },
    { blockType: "hero", heading: "Hero two" },
  ], // >=2 blocks (3, mixed types)
  seo: { seoTitle: "Seo source" }, // named tab → data boundary at `seo`
  note: "Note source", // unnamed tab → flattened to top level
};

describe("document translation (manual enqueue, en -> de/fr)", () => {
  let ctx: TestPayload;
  let id: string;

  beforeAll(async () => {
    ctx = await bootTestPayload(); // no auto-translate — translate explicitly via the enqueue route
    const created = await ctx.payload.create({ collection: "docs", locale: "en", data: EN });
    id = String(created.id);
    for (const target of ["de", "fr"]) {
      const res = await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
        body: {
          source_lng: "en",
          target_lng: target,
          collection_slug: "docs",
          collection_id: [id],
          strategy: "overwrite",
          publish_on_translation: true,
        },
      });
      expect(res.status).toBe(200);
    }
  });

  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("translates every localized leaf across group / array / blocks / tabs into de", async () => {
    const de = await ctx.payload.findByID({ collection: "docs", id, locale: "de" });
    expect(de.title).toBe(rev("Title source"));
    expect((de.meta as { subtitle: string }).subtitle).toBe(rev("Subtitle source"));
    const items = de.items as { label: string }[];
    expect(items.map((i) => i.label)).toEqual([rev("Item one"), rev("Item two")]);
    const sections = de.sections as { blockType: string; heading?: string; caption?: string }[];
    expect(sections.map((b) => b.heading ?? b.caption)).toEqual([
      rev("Hero one"),
      rev("Cta text"),
      rev("Hero two"),
    ]);
    expect((de.seo as { seoTitle: string }).seoTitle).toBe(rev("Seo source"));
    expect(de.note).toBe(rev("Note source"));
  });

  it("populates fr as well (both configured targets)", async () => {
    const fr = await ctx.payload.findByID({ collection: "docs", id, locale: "fr" });
    expect(fr.title).toBe(rev("Title source"));
    expect((fr.seo as { seoTitle: string }).seoTitle).toBe(rev("Seo source"));
  });

  it("leaves non-localized fields untouched (not reversed) in the target locale", async () => {
    const de = await ctx.payload.findByID({ collection: "docs", id, locale: "de" });
    expect(de.ref).toBe("REF-123");
    expect((de.meta as { sku: string }).sku).toBe("SKU-9");
  });

  it("does NOT wipe the source en content — the reconciler regression lock (>=2 blocks/array rows)", async () => {
    const en = await ctx.payload.findByID({ collection: "docs", id, locale: "en" });
    expect(en.title).toBe("Title source");
    expect((en.meta as { subtitle: string }).subtitle).toBe("Subtitle source");
    const items = en.items as { label: string }[];
    expect(items.map((i) => i.label)).toEqual(["Item one", "Item two"]);
    const sections = en.sections as { blockType: string; heading?: string; caption?: string }[];
    expect(sections).toHaveLength(3);
    expect(sections.map((b) => b.heading ?? b.caption)).toEqual([
      "Hero one",
      "Cta text",
      "Hero two",
    ]);
    expect((en.seo as { seoTitle: string }).seoTitle).toBe("Seo source");
    expect(en.note).toBe("Note source");
  });
});

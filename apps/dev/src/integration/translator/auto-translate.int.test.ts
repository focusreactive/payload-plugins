import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";

// R5 — auto-translate (#51), one dedicated case per behavior. Trigger is the real afterChange hook:
// publishing source-locale content runs the sync pipeline inline and writes the targets.

const rev = (s: string) => [...s].reverse().join("");
const PROVENANCE = "translator-provenance";

const provenanceFor = async (ctx: TestPayload, id: string) => {
  const res = await ctx.payload.find({
    collection: PROVENANCE,
    where: { documentId: { equals: id } },
    pagination: false,
  });
  return res.docs as unknown as { targetLocale: string }[];
};

describe("auto-translate — targets de, fr", () => {
  let ctx: TestPayload;
  beforeAll(async () => {
    ctx = await bootTestPayload({ autoTranslate: { targets: ["de", "fr"] } });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("enqueues + runs the configured targets on a published source change", async () => {
    const created = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Auto src" },
    });
    const id = String(created.id);
    const de = await ctx.payload.findByID({ collection: "docs", id, locale: "de" });
    const fr = await ctx.payload.findByID({ collection: "docs", id, locale: "fr" });
    expect(de.title).toBe(rev("Auto src"));
    expect(fr.title).toBe(rev("Auto src"));
  });

  it("publish-gate: a draft (unpublished) save is NOT auto-translated", async () => {
    const created = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { title: "Draft src" }, // no _status:published → draft
    });
    const id = String(created.id);
    const de = await ctx.payload.findByID({ collection: "docs", id, locale: "de" });
    expect(de.title).toBeFalsy();
    expect(await provenanceFor(ctx, id)).toHaveLength(0);
  });

  it("drift-gate: re-publishing unchanged source content does NOT re-translate", async () => {
    const created = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Drift src" },
    });
    const id = String(created.id);
    // Overwrite the auto-produced de value, then re-publish en with identical content.
    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "de",
      data: { _status: "published", title: "MANUAL DE" },
    });
    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "en",
      data: { _status: "published", title: "Drift src" }, // unchanged translatable content
    });
    const de = await ctx.payload.findByID({ collection: "docs", id, locale: "de" });
    expect(de.title).toBe("MANUAL DE"); // drift-gate skipped → manual value survived
  });

  it("loop-guard: one publish does EXACTLY one translation pass per target — no re-triggered work", async () => {
    // Falsifiable via a counter that actually MOVES when work happens: the translation-provider call
    // count. Provenance-row count can't do this job — rows are UPSERTed per target locale, so with two
    // configured targets the row count is pinned at 2 no matter how many times translation re-runs; it
    // would stay 2 even if the loop protection were broken. The provider counter instead increments on
    // every real translate() call, so a re-entry that spawns an extra pass shows up as a larger delta.
    const before = ctx.translateCount();
    const created = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Loop src" },
    });
    const id = String(created.id);
    const passes = ctx.translateCount() - before;
    // One publish → one pass per configured target (de, fr). If the translator's own target writes
    // re-entered the afterChange hook and spawned more translation, this delta would exceed 2.
    expect(passes).toBe(2);
    // And exactly those two targets got provenance — no phantom locale.
    const records = await provenanceFor(ctx, id);
    expect(records.map((r) => r.targetLocale).sort()).toEqual(["de", "fr"]);
  });
});

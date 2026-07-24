import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

// #46 — multi-target fan-out through the real POST /translate/enqueue. The endpoint accepts
// `target_lng` as a string OR string[]; an array fans out one translation task per (document ×
// target locale). Locale validation, de-dup and source-exclusion run server-side regardless of the
// UI `targetSelection` mode. Provenance (one row per target) is the durable per-target record, so it
// doubles as the assertion that every queued target is tracked independently.

const rev = (s: string) => [...s].reverse().join("");
const PROV = "translator-provenance";

type ProvRow = { targetLocale: string; sourceLocale: string };

const provTargets = async (ctx: TestPayload, docId: string): Promise<string[]> => {
  const res = await ctx.payload.find({
    collection: PROV,
    where: { documentId: { equals: docId } },
    limit: 100,
    pagination: false,
  });
  return (res.docs as unknown as ProvRow[]).map((r) => r.targetLocale).sort();
};

const createDoc = async (ctx: TestPayload, title: string): Promise<string> => {
  const created = await ctx.payload.create({
    collection: "docs",
    locale: "en",
    data: { _status: "published", title },
  });
  return String(created.id);
};

const enqueue = (ctx: TestPayload, ids: string[], targetLng: string | string[], sourceLng = "en") =>
  callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: sourceLng,
      target_lng: targetLng,
      collection_slug: "docs",
      collection_id: ids,
      strategy: "overwrite",
      publish_on_translation: true,
    },
  });

const queuedOf = (res: { data: unknown }) => (res.data as { data: { queued: number } }).data.queued;

const titleIn = async (ctx: TestPayload, id: string, locale: string) =>
  (await ctx.payload.findByID({ collection: "docs", id, locale })).title;

describe("multi-target enqueue fan-out (#46)", () => {
  let ctx: TestPayload;

  beforeAll(async () => {
    ctx = await bootTestPayload();
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("fans out one document into every target locale, tracked per target (AC3/AC8)", async () => {
    const id = await createDoc(ctx, "Fanout src");
    const res = await enqueue(ctx, [id], ["de", "fr"]);

    expect(res.status).toBe(200);
    expect(queuedOf(res)).toBe(2); // 1 doc × 2 targets
    expect(await titleIn(ctx, id, "de")).toBe(rev("Fanout src"));
    expect(await titleIn(ctx, id, "fr")).toBe(rev("Fanout src"));
    expect(await titleIn(ctx, id, "en")).toBe("Fanout src"); // source intact
    expect(await provTargets(ctx, id)).toEqual(["de", "fr"]); // independent per-target rows
  });

  it("fans out the full cross-product of documents × targets (AC3)", async () => {
    const a = await createDoc(ctx, "Doc A");
    const b = await createDoc(ctx, "Doc B");

    const res = await enqueue(ctx, [a, b], ["de", "fr"]);

    expect(queuedOf(res)).toBe(4); // 2 docs × 2 targets
    for (const id of [a, b]) {
      expect(await provTargets(ctx, id)).toEqual(["de", "fr"]);
    }
    expect(await titleIn(ctx, a, "fr")).toBe(rev("Doc A"));
    expect(await titleIn(ctx, b, "de")).toBe(rev("Doc B"));
  });

  it("drops an unknown target locale and still runs the valid ones (AC4)", async () => {
    const id = await createDoc(ctx, "Unknown src");

    const res = await enqueue(ctx, [id], ["de", "xx"]);

    expect(queuedOf(res)).toBe(1); // only the configured "de" survives
    expect(await provTargets(ctx, id)).toEqual(["de"]); // no phantom "xx" row
    expect(await titleIn(ctx, id, "de")).toBe(rev("Unknown src"));
  });

  it("de-dups duplicate target locales to one task per locale (AC5)", async () => {
    const id = await createDoc(ctx, "Dedup src");

    const res = await enqueue(ctx, [id], ["de", "de", "fr"]);

    expect(queuedOf(res)).toBe(2);
    expect(await provTargets(ctx, id)).toEqual(["de", "fr"]);
  });

  it("excludes the source locale from the targets (AC6)", async () => {
    const id = await createDoc(ctx, "Selfsrc");

    const res = await enqueue(ctx, [id], ["en", "de"], "en");

    expect(queuedOf(res)).toBe(1); // "en" == source is dropped
    expect(await provTargets(ctx, id)).toEqual(["de"]);
  });

  it("rejects a request whose only targets are the source or unknown (400)", async () => {
    const id = await createDoc(ctx, "Nothing valid");

    const res = await enqueue(ctx, [id], ["en", "xx"], "en");

    expect(res.status).toBe(400);
    expect(await provTargets(ctx, id)).toEqual([]); // nothing queued
  });

  it("keeps a scalar target_lng working end-to-end (back-compat, AC1)", async () => {
    const id = await createDoc(ctx, "Scalar src");

    const res = await enqueue(ctx, [id], "de");

    expect(queuedOf(res)).toBe(1);
    expect(await titleIn(ctx, id, "de")).toBe(rev("Scalar src"));
    expect(await provTargets(ctx, id)).toEqual(["de"]);
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

// Provenance sidecar (#47). Unlike stale-detection (which reads provenance indirectly through the
// staleness endpoint), these assert the `translator-provenance` collection DIRECTLY: one UPSERTed row
// per (collectionSlug, documentId, targetLocale), the stored fingerprint tracks the source, and the
// afterDelete cleanup cascade-removes a document's rows. Provenance is enabled in bootTestPayload.

const PROV = "translator-provenance";

type ProvRow = {
  collectionSlug: string;
  documentId: string;
  targetLocale: string;
  sourceLocale: string;
  sourceFingerprint: string;
  translatedAt?: string;
  dismissedFingerprint?: string | null;
};

const provRows = async (ctx: TestPayload, docId: string): Promise<ProvRow[]> => {
  const res = await ctx.payload.find({
    collection: PROV,
    where: { documentId: { equals: docId } },
    limit: 100,
    pagination: false,
  });
  return res.docs as unknown as ProvRow[];
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

const createDoc = async (ctx: TestPayload, title: string): Promise<string> => {
  const created = await ctx.payload.create({
    collection: "docs",
    locale: "en",
    data: { _status: "published", title },
  });
  return String(created.id);
};

describe("provenance sidecar collection", () => {
  let ctx: TestPayload;

  beforeAll(async () => {
    ctx = await bootTestPayload(); // provenance: true (bootTestPayload default)
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("registers the sidecar collection, hidden from the admin UI", () => {
    const collection = ctx.payload.config.collections.find((c) => c.slug === PROV);
    expect(collection).toBeDefined();
    expect(collection?.admin?.hidden).toBe(true);
  });

  it("records exactly one row per translated target, keyed to the source", async () => {
    const id = await createDoc(ctx, "Prov source");
    await enqueue(ctx, id, "de");
    await enqueue(ctx, id, "fr");

    const rows = await provRows(ctx, id);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.targetLocale).sort()).toEqual(["de", "fr"]);
    for (const row of rows) {
      expect(row.collectionSlug).toBe("docs");
      expect(row.documentId).toBe(id);
      expect(row.sourceLocale).toBe("en");
      expect(row.sourceFingerprint).toBeTruthy();
      expect(row.translatedAt).toBeTruthy();
      // A fresh receipt carries no dismissal.
      expect(row.dismissedFingerprint ?? null).toBeNull();
    }
  });

  it("UPSERTs on re-translation of the same target — no duplicate row", async () => {
    const id = await createDoc(ctx, "Prov upsert");
    await enqueue(ctx, id, "de");
    await enqueue(ctx, id, "de"); // same target again

    const deRows = (await provRows(ctx, id)).filter((r) => r.targetLocale === "de");
    expect(deRows).toHaveLength(1); // keyed by (collection, doc, target) — not appended
  });

  it("updates the stored fingerprint when the source changes and is re-translated", async () => {
    const id = await createDoc(ctx, "Prov fp before");
    await enqueue(ctx, id, "de");
    const before = (await provRows(ctx, id)).find((r) => r.targetLocale === "de");

    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "en",
      data: { _status: "published", title: "Prov fp AFTER (different)" },
    });
    await enqueue(ctx, id, "de");

    const after = (await provRows(ctx, id)).find((r) => r.targetLocale === "de");
    expect(after?.sourceFingerprint).toBeTruthy();
    expect(after?.sourceFingerprint).not.toBe(before?.sourceFingerprint); // tracks the new source
    // Still one row for the target — the fingerprint was replaced in place, not appended.
    expect((await provRows(ctx, id)).filter((r) => r.targetLocale === "de")).toHaveLength(1);
  });

  it("cascade-deletes a document's provenance rows on document delete (afterDelete cleanup)", async () => {
    const id = await createDoc(ctx, "Prov to delete");
    await enqueue(ctx, id, "de");
    await enqueue(ctx, id, "fr");
    expect(await provRows(ctx, id)).toHaveLength(2);

    await ctx.payload.delete({ collection: "docs", id });

    expect(await provRows(ctx, id)).toHaveLength(0); // no orphaned provenance
  });
});

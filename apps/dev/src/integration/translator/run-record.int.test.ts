import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";

// Rows are seeded through the Local API, not translated: what a real translation writes is
// `run-record-write.int.test.ts`.

const RUNS = "translator-runs";

/**
 * Mongo builds a collection's indexes in the background after its first write, so on a brand-new
 * database a duplicate inserted in that window is accepted — measured: only `_id` and `createdAt`
 * exist straight after the first insert, the rest about three seconds later. SQL adapters have the
 * key from the CREATE TABLE onwards.
 */
const KEY_IS_ENFORCED_AT_ONCE = (process.env.DB_ADAPTER ?? "sqlite") !== "mongo";

type SeedRow = {
  handle: string;
  collectionSlug: string;
  collectionId: string;
  targetLng?: string;
};

const seed = (ctx: TestPayload, row: SeedRow) =>
  ctx.payload.create({
    collection: RUNS,
    data: {
      sourceLng: "en",
      targetLng: "de",
      publishOnTranslation: false,
      queuedAt: new Date().toISOString(),
      ...row,
    },
  });

/** Both halves of the key: document ids are per-collection, so an id alone names rows of others. */
const rowsFor = async (
  ctx: TestPayload,
  collectionSlug: string,
  collectionId: string
): Promise<unknown[]> => {
  const found = await ctx.payload.find({
    collection: RUNS,
    where: {
      and: [
        { collectionSlug: { equals: collectionSlug } },
        { collectionId: { equals: collectionId } },
      ],
    },
    limit: 100,
    pagination: false,
  });
  return found.docs;
};

const createDoc = async (ctx: TestPayload, collection: string, title: string): Promise<string> => {
  const created = await ctx.payload.create({
    collection,
    locale: "en",
    data: { _status: "published", title },
  });
  return String(created.id);
};

describe("the run record collection", () => {
  let ctx: TestPayload;

  beforeAll(async () => {
    ctx = await bootTestPayload({
      unmanagedCollections: [{ slug: "assets", fields: [{ name: "title", type: "text" }] }],
    });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("is registered, and hidden from the admin", () => {
    const collection = ctx.payload.config.collections.find((c) => c.slug === RUNS);

    expect(collection).toBeDefined();
    expect(collection?.admin?.hidden).toBe(true);
  });

  it.skipIf(!KEY_IS_ENFORCED_AT_ONCE)(
    "holds one row per handle and target locale, and refuses a second",
    async () => {
      const id = await createDoc(ctx, "docs", "one key");
      await seed(ctx, { handle: "h-unique", collectionSlug: "docs", collectionId: id });

      await expect(
        seed(ctx, { handle: "h-unique", collectionSlug: "docs", collectionId: id })
      ).rejects.toThrow();

      expect(await rowsFor(ctx, "docs", id)).toHaveLength(1);
    }
  );

  it("holds a row per locale under one handle", async () => {
    const id = await createDoc(ctx, "docs", "two locales");
    await seed(ctx, { handle: "h-fan", collectionSlug: "docs", collectionId: id, targetLng: "de" });
    await seed(ctx, { handle: "h-fan", collectionSlug: "docs", collectionId: id, targetLng: "fr" });

    expect(await rowsFor(ctx, "docs", id)).toHaveLength(2);
  });

  it("loses a document's rows when the document is deleted", async () => {
    const id = await createDoc(ctx, "docs", "to be deleted");
    await seed(ctx, { handle: "h-del", collectionSlug: "docs", collectionId: id, targetLng: "de" });
    await seed(ctx, { handle: "h-del", collectionSlug: "docs", collectionId: id, targetLng: "fr" });

    await ctx.payload.delete({ collection: "docs", id });

    expect(await rowsFor(ctx, "docs", id)).toHaveLength(0);
  });

  it("keeps the rows of every other document", async () => {
    const kept = await createDoc(ctx, "docs", "a bystander");
    const doomed = await createDoc(ctx, "docs", "the deleted one");
    await seed(ctx, { handle: "h-keep", collectionSlug: "docs", collectionId: kept });
    await seed(ctx, { handle: "h-doom", collectionSlug: "docs", collectionId: doomed });

    await ctx.payload.delete({ collection: "docs", id: doomed });

    expect(await rowsFor(ctx, "docs", kept)).toHaveLength(1);
  });

  it("leaves rows alone when a collection the plugin does not translate is deleted", async () => {
    const asset = await createDoc(ctx, "assets", "an untranslated asset");
    await seed(ctx, { handle: "h-asset", collectionSlug: "assets", collectionId: asset });

    await ctx.payload.delete({ collection: "assets", id: asset });

    expect(await rowsFor(ctx, "assets", asset)).toHaveLength(1);
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CollectionConfig } from "payload";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { buildTestCollections } from "./testCollections";

// SQLite is the one adapter that opens no transaction: `defaultBeginTransaction` resolves to null
// unless `transactionOptions` is passed. Postgres and Mongo both set `req.transactionID`.
const SQLITE = process.env.DB_ADAPTER === "sqlite";

let ctx: TestPayload;

// Same setup as transaction-validation-failure: the target-locale write fails Payload's own
// validation, so the failure comes from a Payload operation rather than from the provider.
const rejectTranslated = (collections: CollectionConfig[]): CollectionConfig[] =>
  collections.map((c) => {
    if (c.slug !== "docs") return c;
    return {
      ...c,
      fields: c.fields.map((f) =>
        "name" in f && f.name === "title"
          ? {
              ...f,
              validate: (value: unknown) =>
                typeof value === "string" && value.startsWith("de:")
                  ? "the de locale rejects this value"
                  : true,
            }
          : f
      ),
    } as CollectionConfig;
  });

describe.skipIf(!SQLITE)("a target write rejected on an adapter with no transaction", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      collections: rejectTranslated(buildTestCollections()),
      autoTranslate: { targets: ["de"] },
    });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("keeps the save, because no transaction carried it", async () => {
    await expect(
      ctx.payload.create({
        collection: "docs" as "pages",
        locale: "en",
        data: { title: "Editor wrote this", _status: "published" } as never,
      }),
      "nothing of the editor's was rolled back, so the lost translation must not cost them the save"
    ).resolves.toBeDefined();

    const { docs } = await ctx.payload.find({
      collection: "docs" as "pages",
      locale: "en",
      pagination: false,
      where: { title: { equals: "Editor wrote this" } } as never,
    });
    expect(docs, "the save survived").toHaveLength(1);
  });
});

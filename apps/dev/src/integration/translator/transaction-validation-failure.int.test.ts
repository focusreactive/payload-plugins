import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CollectionConfig } from "payload";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { buildTestCollections } from "./testCollections";

// Postgres: the adapter that isolates a transaction.
const POSTGRES = process.env.DB_ADAPTER === "postgres";

let ctx: TestPayload;

// The target-locale write fails Payload's own validation, so the error is raised by a Payload
// *operation* rather than by the provider — the case that reaches `killTransaction`.
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

describe.skipIf(!POSTGRES)("a target write rejected by validation", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      collections: rejectTranslated(buildTestCollections()),
      autoTranslate: { targets: ["de"] },
    });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("fails the save visibly instead of discarding it in silence", async () => {
    await expect(
      ctx.payload.create({
        collection: "docs" as "pages",
        locale: "en",
        data: { title: "Editor wrote this", _status: "published" } as never,
      })
    ).rejects.toThrow();

    const { docs } = await ctx.payload.find({
      collection: "docs" as "pages",
      locale: "en",
      pagination: false,
      where: { title: { equals: "Editor wrote this" } } as never,
    });
    expect(docs, "the rejected save left a row behind").toHaveLength(0);
  });
});

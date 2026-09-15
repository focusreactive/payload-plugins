import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";

// Postgres only: the other adapters do not isolate a transaction, so the spec would assert nothing.
const POSTGRES = process.env.DB_ADAPTER === "postgres";

let ctx: TestPayload;

describe.skipIf(!POSTGRES)("a translation that fails inside the caller's transaction", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      autoTranslate: { targets: ["de", "fr"] },
      failFor: ["de"],
    });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("does not fail the save that triggered it", async () => {
    const created = await ctx.payload.create({
      collection: "docs" as "pages",
      locale: "en",
      data: { title: "Survives", _status: "published" } as never,
    });

    const read = await ctx.payload.findByID({
      collection: "docs" as "pages",
      id: created.id,
      locale: "en",
    });
    expect((read as { title?: string }).title).toBe("Survives");
  });

  it("still translates the locales that did not fail", async () => {
    const created = await ctx.payload.create({
      collection: "docs" as "pages",
      locale: "en",
      data: { title: "Partial", _status: "published" } as never,
    });

    const fr = await ctx.payload.findByID({
      collection: "docs" as "pages",
      id: created.id,
      locale: "fr",
    });
    const de = await ctx.payload.findByID({
      collection: "docs" as "pages",
      id: created.id,
      locale: "de",
    });
    expect((fr as { title?: string }).title).toBe("fr:Partial");
    expect((de as { title?: string }).title).not.toBe("de:Partial");
  });
});

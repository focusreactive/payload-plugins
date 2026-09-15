import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";

// Postgres only. An explicit begin/rollback does not roll the document back on SQLite — the row
// survives — so the same spec would assert nothing there. MongoDB needs a replica set for
// transactions at all.
const POSTGRES = process.env.DB_ADAPTER === "postgres";

let ctx: TestPayload;

const beginTransaction = async (): Promise<string | number> => {
  const transactionID = await ctx.payload.db.beginTransaction?.({});
  expect(transactionID, "the adapter opened no transaction").toBeTruthy();
  return transactionID as string | number;
};

const provenanceFor = async (documentId: string) => {
  const { docs } = await ctx.payload.find({
    collection: "translator-provenance" as "pages",
    pagination: false,
    where: { documentId: { equals: documentId } } as never,
  });
  return docs;
};

describe.skipIf(!POSTGRES)("a translation is atomic with the save that triggered it", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({ autoTranslate: { targets: ["de"] } });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("leaves no translation and no receipt behind when the save rolls back", async () => {
    const transactionID = await beginTransaction();
    const created = await ctx.payload.create({
      collection: "docs" as "pages",
      locale: "en",
      data: { title: "Rolled back", _status: "published" } as never,
      req: { transactionID } as never,
    });
    const id = String(created.id);

    await ctx.payload.db.rollbackTransaction?.(transactionID);

    const { docs } = await ctx.payload.find({
      collection: "docs" as "pages",
      pagination: false,
      where: { id: { equals: id } } as never,
    });
    expect(docs, "the rolled-back document survived").toHaveLength(0);
    expect(await provenanceFor(id), "a receipt outlived the write it certifies").toHaveLength(0);
  });

  it("commits the translation and the receipt when the save commits", async () => {
    const created = await ctx.payload.create({
      collection: "docs" as "pages",
      locale: "en",
      data: { title: "Committed", _status: "published" } as never,
    });
    const id = String(created.id);

    const de = await ctx.payload.findByID({ collection: "docs" as "pages", id, locale: "de" });
    expect((de as { title?: string }).title).toBe("de:Committed");
    expect(await provenanceFor(id)).toHaveLength(1);
  });

  it("translates every document of a bulk publish, not just the first", async () => {
    const ids = [];
    for (const title of ["Bulk one", "Bulk two"]) {
      const doc = await ctx.payload.create({
        collection: "docs" as "pages",
        locale: "en",
        data: { title, ref: "bulk-batch" } as never,
      });
      ids.push(String(doc.id));
    }

    await ctx.payload.update({
      collection: "docs" as "pages",
      locale: "en",
      where: { ref: { equals: "bulk-batch" } } as never,
      // The content must change too: a publish that edits nothing is skipped by the drift-gate.
      data: { _status: "published", title: "Bulk edited" } as never,
    });

    for (const [i, id] of ids.entries()) {
      const de = await ctx.payload.findByID({ collection: "docs" as "pages", id, locale: "de" });
      expect((de as { title?: string }).title, `document ${i + 1} of the batch`).toBe(
        "de:Bulk edited"
      );
    }
  });
});

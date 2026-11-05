import { createLocalReq } from "payload";
import type {
  CollectionAfterChangeHook,
  CollectionBeforeValidateHook,
  CollectionConfig,
  Field,
} from "payload";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { bootAuditPayload, targetEvents, timestampAfterEverythingSoFar } from "./bootAuditPayload";
import type { AuditTestPayload } from "./bootAuditPayload";

const NESTED = "savedByBulkUpdate";
const BULK_NOTE = "set by bulk update";
const REJECTED_TITLE = "rejected";

const fields: Field[] = [
  { name: "title", type: "text" },
  { name: "note", type: "text" },
  { name: "group", type: "text" },
];

const bulkUpdateSavedDoc =
  (collection: string): CollectionAfterChangeHook =>
  async ({ doc, req, context }) => {
    if (context[NESTED]) return doc;
    await req.payload.update({
      collection: collection as never,
      where: { id: { equals: doc.id } },
      data: { note: BULK_NOTE } as never,
      req,
      context: { [NESTED]: true },
    });
    return doc;
  };

const rejectTitle: CollectionBeforeValidateHook = ({ data }) => {
  if (data?.title === REJECTED_TITLE) throw new Error("the project rejected this save");
  return data;
};

const withBulkUpdateAfterChange = (collection: CollectionConfig): CollectionConfig => ({
  ...collection,
  fields,
  hooks: { afterChange: [bulkUpdateSavedDoc(collection.slug)] },
});

const COLLECTIONS: CollectionConfig[] = [
  withBulkUpdateAfterChange({
    slug: "bulk-autosaved-pages",
    versions: { drafts: { autosave: true } },
    fields: [],
  }),
  withBulkUpdateAfterChange({
    slug: "bulk-versioned-pages",
    versions: { maxPerDoc: 10 },
    fields: [],
  }),
  withBulkUpdateAfterChange({ slug: "bulk-plain-pages", fields: [] }),
  {
    slug: "rejecting-pages",
    versions: { drafts: { autosave: true } },
    fields,
    hooks: { beforeValidate: [rejectTitle] },
  },
];

let ctx: AuditTestPayload;
beforeAll(async () => {
  ctx = await bootAuditPayload({ collections: COLLECTIONS, enableSqliteTransactions: true });
});
afterAll(async () => {
  await ctx?.cleanup();
});

let testStartedAt = "";
beforeEach(async () => {
  testStartedAt = await timestampAfterEverythingSoFar();
});

const startOfTheSavesUnderTest = async () => {
  testStartedAt = await timestampAfterEverythingSoFar();
};

const docEventsOfThisTest = async (collection: string, id: unknown) =>
  (await targetEvents(ctx.payload, collection, id, testStartedAt)).map((event) => [
    event.action,
    event.changes,
  ]);

const createDoc = async (collection: string, data: Record<string, unknown>) =>
  (await ctx.payload.create({
    collection: collection as never,
    data: { group: "g", ...data } as never,
    context: { [NESTED]: true },
  })) as unknown as { id: string };

const storedNote = async (collection: string, id: string) => {
  const stored = await ctx.payload.db.findOne<{ id: string; note?: string }>({
    collection,
    where: { id: { equals: id } },
  });
  return stored?.note;
};

describe("a bulk update that an afterChange hook runs on the document it saves", () => {
  it("records the bulk update and still skips the autosave tick", async () => {
    const page = await createDoc("bulk-autosaved-pages", { title: "A", _status: "published" });
    await startOfTheSavesUnderTest();
    await ctx.payload.update({
      collection: "bulk-autosaved-pages" as never,
      id: page.id,
      data: { title: "A-tick" } as never,
      draft: true,
      autosave: true,
    });
    expect(await storedNote("bulk-autosaved-pages", page.id)).toBe(BULK_NOTE);
    expect(await docEventsOfThisTest("bulk-autosaved-pages", page.id)).toEqual([
      ["doc.update", ["note"]],
    ]);
  });

  it("records the restore and the bulk update with their own changes", async () => {
    const page = await createDoc("bulk-versioned-pages", { title: "V1" });
    await ctx.payload.update({
      collection: "bulk-versioned-pages" as never,
      id: page.id,
      data: { title: "V2" } as never,
      context: { [NESTED]: true },
    });
    const { docs: versions } = await ctx.payload.findVersions({
      collection: "bulk-versioned-pages" as never,
      where: { parent: { equals: page.id } },
      sort: "createdAt",
    });
    await startOfTheSavesUnderTest();
    await ctx.payload.restoreVersion({
      collection: "bulk-versioned-pages" as never,
      id: String(versions[0]?.id),
    });
    expect(await docEventsOfThisTest("bulk-versioned-pages", page.id)).toEqual([
      ["doc.update", ["note"]],
      ["doc.restore", ["title"]],
    ]);
  });

  it("compares only the selected fields of the save that selected them", async () => {
    const page = await createDoc("bulk-plain-pages", { title: "P1" });
    await startOfTheSavesUnderTest();
    await ctx.payload.update({
      collection: "bulk-plain-pages" as never,
      id: page.id,
      data: { title: "P2" } as never,
      select: { title: true },
    });
    expect(await docEventsOfThisTest("bulk-plain-pages", page.id)).toEqual([
      ["doc.update", ["note"]],
      ["doc.update", ["title"]],
    ]);
  });
});

describe.each([
  { transactions: "in a transaction", disableTransaction: false },
  { transactions: "without a transaction", disableTransaction: true },
])("a bulk update after a save rejected $transactions", ({ disableTransaction }) => {
  it("records the bulk update instead of treating it as the rejected autosave tick", async () => {
    const page = await createDoc("rejecting-pages", { title: "A", _status: "published" });
    await startOfTheSavesUnderTest();
    const req = await createLocalReq({}, ctx.payload);
    await expect(
      ctx.payload.update({
        collection: "rejecting-pages" as never,
        id: page.id,
        data: { title: REJECTED_TITLE } as never,
        draft: true,
        autosave: true,
        req,
        disableTransaction,
      })
    ).rejects.toThrow("the project rejected this save");
    await ctx.payload.update({
      collection: "rejecting-pages" as never,
      where: { id: { equals: page.id } },
      data: { note: BULK_NOTE } as never,
      req,
      disableTransaction,
    });
    expect(await docEventsOfThisTest("rejecting-pages", page.id)).toEqual([
      ["doc.update", ["note"]],
    ]);
  });
});

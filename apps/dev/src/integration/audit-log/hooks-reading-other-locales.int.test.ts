import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeDeleteHook,
  CollectionConfig,
  GlobalAfterChangeHook,
  GlobalConfig,
} from "payload";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  bootAuditPayload,
  createUser,
  events,
  loginHeaders,
  rest,
  targetEvents,
  timestampAfterEverythingSoFar,
} from "./bootAuditPayload";
import type { AuditEventRow, AuditTestPayload } from "./bootAuditPayload";

const LOCALES = ["en", "de"] as const;
const PUBLISHED = { _status: "published" } as const;

const readInEveryLocale: CollectionAfterChangeHook = async ({ collection, doc, req }) => {
  for (const locale of LOCALES) {
    await req.payload.findByID({
      collection: collection.slug as never,
      id: doc.id,
      locale,
      overrideAccess: true,
      req,
    });
  }
  return doc;
};

const readBeforeDeleteInEveryLocale: CollectionBeforeDeleteHook = async ({
  collection,
  id,
  req,
}) => {
  for (const locale of LOCALES) {
    await req.payload.findByID({ collection: collection.slug as never, id, locale, req });
  }
};

const listAfterDeleteInEveryLocale: CollectionAfterDeleteHook = async ({
  collection,
  doc,
  req,
}) => {
  for (const locale of LOCALES) {
    await req.payload.find({ collection: collection.slug as never, limit: 1, locale, req });
  }
  return doc;
};

const readGlobalInEveryLocale: GlobalAfterChangeHook = async ({ doc, global, req }) => {
  for (const locale of LOCALES) {
    await req.payload.findGlobal({ slug: global.slug as never, locale, req });
  }
  return doc;
};

const REINDEXED_COLLECTIONS: CollectionConfig[] = [
  {
    slug: "reindexed-pages",
    versions: { drafts: true },
    fields: [
      { name: "title", type: "text", localized: true },
      { name: "code", type: "text" },
    ],
    hooks: { afterChange: [readInEveryLocale] },
  },
  {
    slug: "checked-before-delete",
    fields: [{ name: "title", type: "text", localized: true }],
    hooks: { beforeDelete: [readBeforeDeleteInEveryLocale] },
  },
  {
    slug: "listed-after-delete",
    fields: [{ name: "title", type: "text", localized: true }],
    hooks: { afterDelete: [listAfterDeleteInEveryLocale] },
  },
];

const REINDEXED_GLOBALS: GlobalConfig[] = [
  {
    slug: "reindexed-settings",
    fields: [{ name: "motto", type: "text", localized: true }],
    hooks: { afterChange: [readGlobalInEveryLocale] },
  },
];

let ctx: AuditTestPayload;
let signedIn: Record<string, string>;
beforeAll(async () => {
  ctx = await bootAuditPayload({
    collections: REINDEXED_COLLECTIONS,
    globals: REINDEXED_GLOBALS,
  });
  await createUser(ctx.payload, "reindex-admin@x.io", { role: "admin" });
  signedIn = await loginHeaders(ctx.payload, "reindex-admin@x.io");
});
afterAll(async () => {
  await ctx?.cleanup();
});

let testStartedAt = "";
beforeEach(async () => {
  testStartedAt = await timestampAfterEverythingSoFar();
});

const startOfTheSaveUnderTest = async () => {
  testStartedAt = await timestampAfterEverythingSoFar();
};

const actionLocaleAndChanges = (log: AuditEventRow[]) =>
  log.map((event) => [event.action, event.target?.locale, event.changes]);

const pageEventsOfThisTest = async (id: unknown) =>
  actionLocaleAndChanges(await targetEvents(ctx.payload, "reindexed-pages", id, testStartedAt));

const settingsEventsOfThisTest = async () =>
  actionLocaleAndChanges(
    await events(ctx.payload, {
      and: [
        { "target.slug": { equals: "reindexed-settings" } },
        { occurredAt: { greater_than_equal: testStartedAt } },
      ],
    })
  );

const deleteEventsOfThisTest = async (slug: string) =>
  (
    await events(ctx.payload, {
      and: [
        { action: { equals: "doc.delete" } },
        { "target.slug": { equals: slug } },
        { occurredAt: { greater_than_equal: testStartedAt } },
      ],
    })
  ).map((event) => [event.action, event.target?.locale]);

const createDocs = async (slug: string, count: number) => {
  const docs = [];
  for (let index = 0; index < count; index += 1) {
    docs.push(
      await ctx.payload.create({
        collection: slug as never,
        data: { title: `Doc ${index}` } as never,
        locale: "en",
      })
    );
  }
  await startOfTheSaveUnderTest();
  return docs;
};

const createGermanAndEnglishPage = async () => {
  const page = await ctx.payload.create({
    collection: "reindexed-pages" as never,
    data: { title: "Hello", code: "a" } as never,
    locale: "en",
    draft: true,
  });
  await ctx.payload.update({
    collection: "reindexed-pages" as never,
    id: page.id,
    data: { title: "Hallo" } as never,
    locale: "de",
    draft: true,
  });
  return page;
};

describe("saves whose own hooks read the document in other locales", () => {
  it("a publish over REST keeps the locale it was sent in", async () => {
    const page = await createGermanAndEnglishPage();
    await startOfTheSaveUnderTest();

    const res = await rest(ctx.payload, "PATCH", `/reindexed-pages/${page.id}?locale=en`, {
      body: { title: "Hello world", ...PUBLISHED },
      headers: signedIn,
    });

    expect(res.status).toBe(200);
    expect(await pageEventsOfThisTest(page.id)).toEqual([
      ["doc.publish", "en", ["title", "_status"]],
    ]);
  });

  it("a Local API update keeps the locale it was made in and diffs that locale", async () => {
    const page = await createGermanAndEnglishPage();
    await ctx.payload.update({
      collection: "reindexed-pages" as never,
      id: page.id,
      data: PUBLISHED as never,
      locale: "en",
    });
    await startOfTheSaveUnderTest();

    await ctx.payload.update({
      collection: "reindexed-pages" as never,
      id: page.id,
      data: { title: "Hello again" } as never,
      locale: "en",
    });

    expect(await pageEventsOfThisTest(page.id)).toEqual([["doc.update", "en", ["title"]]]);
  });

  it("a bulk publish of one locale keeps the locale it wrote, which Payload does not switch", async () => {
    const page = await createGermanAndEnglishPage();
    await ctx.payload.update({
      collection: "reindexed-pages" as never,
      id: page.id,
      data: PUBLISHED as never,
      locale: "en",
    });
    await startOfTheSaveUnderTest();

    await ctx.payload.update({
      collection: "reindexed-pages" as never,
      where: { id: { equals: page.id } },
      data: { title: "Hello again", ...PUBLISHED } as never,
      locale: "en",
      publishSpecificLocale: "de",
    });

    expect(await pageEventsOfThisTest(page.id)).toEqual([["doc.update", "en", ["title"]]]);
  });

  it("a restore keeps the locale it was made in", async () => {
    const page = await createGermanAndEnglishPage();
    const [firstVersion] = (
      await ctx.payload.findVersions({
        collection: "reindexed-pages" as never,
        where: { parent: { equals: page.id } },
        sort: "createdAt",
      })
    ).docs;
    await startOfTheSaveUnderTest();

    await ctx.payload.restoreVersion({
      collection: "reindexed-pages" as never,
      id: String(firstVersion?.id),
      locale: "en",
    });

    expect(
      (await pageEventsOfThisTest(page.id)).map(([action, locale]) => [action, locale])
    ).toEqual([["doc.restore", "en"]]);
  });

  it("a duplicate keeps the locale it was made in", async () => {
    const page = await createGermanAndEnglishPage();
    await startOfTheSaveUnderTest();

    const copy = await ctx.payload.duplicate({
      collection: "reindexed-pages" as never,
      id: page.id,
      locale: "en",
    });

    expect(
      (await pageEventsOfThisTest(copy.id)).map(([action, locale]) => [action, locale])
    ).toEqual([["doc.create", "en"]]);
  });

  it("a global save keeps the locale it was made in", async () => {
    await ctx.payload.updateGlobal({
      slug: "reindexed-settings" as never,
      data: { motto: "Hallo" } as never,
      locale: "de",
    });
    await startOfTheSaveUnderTest();

    await ctx.payload.updateGlobal({
      slug: "reindexed-settings" as never,
      data: { motto: "Hello" } as never,
      locale: "en",
    });

    expect(await settingsEventsOfThisTest()).toEqual([["global.update", "en", ["motto"]]]);
  });
});

describe("deletes whose own hooks read documents in other locales", () => {
  it("a delete over REST keeps the locale it was sent in when a beforeDelete hook reads other locales", async () => {
    const [doc] = await createDocs("checked-before-delete", 1);

    const res = await rest(ctx.payload, "DELETE", `/checked-before-delete/${doc?.id}?locale=en`, {
      headers: signedIn,
    });

    expect(res.status).toBe(200);
    expect(await deleteEventsOfThisTest("checked-before-delete")).toEqual([["doc.delete", "en"]]);
  });

  it("a Local API delete keeps the locale it was made in when an afterDelete hook reads other locales", async () => {
    const [doc] = await createDocs("listed-after-delete", 1);

    await ctx.payload.delete({
      collection: "listed-after-delete" as never,
      id: doc?.id as number,
      locale: "en",
    });

    expect(await deleteEventsOfThisTest("listed-after-delete")).toEqual([["doc.delete", "en"]]);
  });

  it("a bulk delete keeps the locale it was made in for every document", async () => {
    const docs = await createDocs("listed-after-delete", 2);

    await ctx.payload.delete({
      collection: "listed-after-delete" as never,
      where: { id: { in: docs.map((doc) => doc.id) } },
      locale: "en",
    });

    expect(await deleteEventsOfThisTest("listed-after-delete")).toEqual([
      ["doc.delete", "en"],
      ["doc.delete", "en"],
    ]);
  });
});

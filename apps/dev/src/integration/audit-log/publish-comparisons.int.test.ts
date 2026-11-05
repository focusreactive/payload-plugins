import type { CollectionConfig, Field, GlobalConfig } from "payload";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  bootAuditPayload,
  createUser,
  events,
  loginHeaders,
  PASSWORD,
  rest,
  targetEvents,
  timestampAfterEverythingSoFar,
} from "./bootAuditPayload";
import type { AuditEventRow, AuditTestPayload } from "./bootAuditPayload";

const AUTOSAVE = { drafts: { autosave: true } } as const;
const KEEPING_TWO_VERSIONS = { maxPerDoc: 2, ...AUTOSAVE } as const;
const PUBLISHED = { _status: "published" } as const;

const pageFields: Field[] = [
  { name: "title", type: "text" },
  { name: "body", type: "text" },
  { name: "extra", type: "text" },
];

const memberFields: Field[] = [
  { name: "role", type: "text" },
  { name: "name", type: "text" },
];

const restrictedLocalizedFields: Field[] = [
  { name: "title", type: "text", localized: true },
  { name: "unreadable", type: "text", localized: true, access: { read: () => false } },
  { name: "secret", type: "text", localized: true, hidden: true },
];

const COLLECTIONS: CollectionConfig[] = [
  { slug: "pruned-pages", versions: KEEPING_TWO_VERSIONS, fields: pageFields },
  { slug: "kept-pages", versions: AUTOSAVE, fields: pageFields },
  {
    slug: "pruned-members",
    auth: { useAPIKey: true },
    versions: KEEPING_TWO_VERSIONS,
    fields: memberFields,
  },
  { slug: "kept-members", auth: { useAPIKey: true }, versions: AUTOSAVE, fields: memberFields },
  { slug: "restricted-docs", versions: AUTOSAVE, fields: restrictedLocalizedFields },
];

const GLOBALS: GlobalConfig[] = [
  { slug: "restricted-global", versions: AUTOSAVE, fields: restrictedLocalizedFields },
];

let ctx: AuditTestPayload;
let signedIn: Record<string, string>;
beforeAll(async () => {
  ctx = await bootAuditPayload({ collections: COLLECTIONS, globals: GLOBALS });
  await createUser(ctx.payload, "publish-comparisons@x.io", { role: "admin" });
  signedIn = await loginHeaders(ctx.payload, "publish-comparisons@x.io");
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

const actionsAndChanges = (log: AuditEventRow[]) =>
  log.map((event) => [event.action, event.changes]);

const docEventsOfThisTest = async (collection: string, id: unknown) =>
  actionsAndChanges(await targetEvents(ctx.payload, collection, id, testStartedAt));

const update = (collection: string, id: unknown, data: Record<string, unknown>, options = {}) =>
  ctx.payload.update({
    collection: collection as never,
    id: id as string,
    data: data as never,
    ...options,
  });

const publishedVersionsOf = async (collection: string, id: unknown) =>
  (
    await ctx.payload.db.findVersions({
      collection,
      where: { and: [{ parent: { equals: id } }, { "version._status": { equals: "published" } }] },
      pagination: false,
    })
  ).docs.length;

describe("a publish after its previous publish was pruned from the versions", () => {
  const publishAfterTwoDrafts = async (collection: string) => {
    const page = (await ctx.payload.create({
      collection: collection as never,
      data: { title: "t", body: "b", extra: "e", ...PUBLISHED } as never,
    })) as unknown as { id: string };
    await update(collection, page.id, { title: "t2" }, { draft: true });
    await update(collection, page.id, { title: "t3" }, { draft: true });
    const publishesBefore = await publishedVersionsOf(collection, page.id);
    await startOfTheSavesUnderTest();
    await update(collection, page.id, { title: "t4", ...PUBLISHED });
    return { publishesBefore, log: await docEventsOfThisTest(collection, page.id) };
  };

  it("lists the fields changed since the live document, as when it was kept", async () => {
    const kept = await publishAfterTwoDrafts("kept-pages");
    const pruned = await publishAfterTwoDrafts("pruned-pages");

    expect(kept.publishesBefore).toBe(1);
    expect(pruned.publishesBefore).toBe(0);
    expect(pruned.log).toEqual([["doc.publish", ["title"]]]);
    expect(pruned.log).toEqual(kept.log);
  });

  const publishRoleAndKeyDrafts = async (collection: string) => {
    const member = (await ctx.payload.create({
      collection: collection as never,
      data: {
        email: `${collection}@x.io`,
        password: PASSWORD,
        role: "editor",
        name: "n",
        ...PUBLISHED,
      } as never,
    })) as unknown as { id: string };
    await update(collection, member.id, { role: "admin" }, { draft: true });
    await update(collection, member.id, { name: "n2" }, { draft: true });
    await update(
      collection,
      member.id,
      { enableAPIKey: true, apiKey: `${collection}-key` },
      { draft: true }
    );
    await startOfTheSavesUnderTest();
    await update(collection, member.id, PUBLISHED);
    return docEventsOfThisTest(collection, member.id);
  };

  it("still records the role and API key it makes live, as when it was kept", async () => {
    const kept = await publishRoleAndKeyDrafts("kept-members");
    const pruned = await publishRoleAndKeyDrafts("pruned-members");

    expect(pruned).toEqual([
      ["apikey.created", ["role", "name", "enableAPIKey"]],
      ["user.role_changed", ["role"]],
    ]);
    expect(pruned).toEqual(kept);
  });
});

describe("an autosave publish re-sending unchanged localized fields the caller cannot read", () => {
  const unchangedInEnglish = { unreadable: "same-en", secret: "s-en" };
  const otherInGerman = { title: "T-de", unreadable: "other-de", secret: "s-de", ...PUBLISHED };

  const globalEventsOfThisTest = async () =>
    actionsAndChanges(
      await events(ctx.payload, {
        and: [
          { "target.kind": { equals: "global" } },
          { "target.slug": { equals: "restricted-global" } },
          { occurredAt: { greater_than_equal: testStartedAt } },
        ],
      })
    );

  const publishInEnglish = async (path: string, method: "PATCH" | "POST") => {
    const res = await rest(ctx.payload, method, `${path}?locale=en`, {
      body: { title: "T3", ...unchangedInEnglish, ...PUBLISHED },
      headers: signedIn,
    });
    expect(res.status).toBe(200);
  };

  it("lists only the field that changed in a collection", async () => {
    const doc = (await ctx.payload.create({
      collection: "restricted-docs" as never,
      locale: "en",
      data: { title: "T", ...unchangedInEnglish, ...PUBLISHED } as never,
    })) as unknown as { id: string };
    await update("restricted-docs", doc.id, otherInGerman, { locale: "de" });
    await update("restricted-docs", doc.id, { title: "T2" }, { locale: "en", draft: true });
    await startOfTheSavesUnderTest();

    await publishInEnglish(`/restricted-docs/${doc.id}`, "PATCH");

    expect(await docEventsOfThisTest("restricted-docs", doc.id)).toEqual([
      ["doc.publish", ["title"]],
    ]);
  });

  it("lists only the field that changed in a global", async () => {
    const updateGlobal = (data: Record<string, unknown>, options: Record<string, unknown>) =>
      ctx.payload.updateGlobal({
        slug: "restricted-global" as never,
        data: data as never,
        ...options,
      });
    await updateGlobal({ title: "T", ...unchangedInEnglish, ...PUBLISHED }, { locale: "en" });
    await updateGlobal(otherInGerman, { locale: "de" });
    await updateGlobal({ title: "T2" }, { locale: "en", draft: true });
    await startOfTheSavesUnderTest();

    await publishInEnglish("/globals/restricted-global", "POST");

    expect(await globalEventsOfThisTest()).toEqual([["global.publish", ["title"]]]);
  });
});

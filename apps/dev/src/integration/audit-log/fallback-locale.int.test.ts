import type { CollectionConfig, FieldHook } from "payload";
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

const GERMAN = { locale: "de" } as const;

const summaryOfTitle: FieldHook = ({ siblingData }) =>
  siblingData?.title ? `Summary of ${siblingData.title}` : undefined;

let revisions = 0;
const nextRevision: FieldHook = () => {
  revisions += 1;
  return `r${revisions}`;
};

const normalizedCode: FieldHook = ({ value }) =>
  typeof value === "string" ? value.trim().toUpperCase() : value;

const FIELD_HOOKED_COLLECTIONS: CollectionConfig[] = [
  {
    slug: "summarized",
    fields: [
      { name: "title", type: "text", localized: true },
      {
        name: "summary",
        type: "text",
        localized: true,
        hooks: { beforeChange: [summaryOfTitle] },
      },
    ],
  },
  {
    slug: "revisioned",
    fields: [
      { name: "title", type: "text", localized: true },
      { name: "revision", type: "text", localized: true, hooks: { beforeChange: [nextRevision] } },
    ],
  },
  {
    slug: "codes",
    fields: [
      { name: "code", type: "text", localized: true, hooks: { beforeChange: [normalizedCode] } },
    ],
  },
];

let ctx: AuditTestPayload;
let signedIn: Record<string, string>;
beforeAll(async () => {
  ctx = await bootAuditPayload({
    localizationFallback: true,
    collections: FIELD_HOOKED_COLLECTIONS,
  });
  await createUser(ctx.payload, "fallback-admin@example.com", { role: "admin" });
  signedIn = await loginHeaders(ctx.payload, "fallback-admin@example.com");
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

const userEventsOfThisTest = async (id: unknown) =>
  actionsAndChanges(await targetEvents(ctx.payload, "users", id, testStartedAt));

const globalEventsOfThisTest = async (slug: string) =>
  actionsAndChanges(
    await events(ctx.payload, {
      and: [
        { "target.kind": { equals: "global" } },
        { "target.slug": { equals: slug } },
        { occurredAt: { greater_than_equal: testStartedAt } },
      ],
    })
  );

const updateUser = (id: unknown, data: Record<string, unknown>, options = {}) =>
  ctx.payload.update({
    collection: "users" as never,
    id: id as string,
    data: data as never,
    ...options,
  });

const updateLocalizedSettings = (data: Record<string, unknown>, options = {}) =>
  ctx.payload.updateGlobal({
    slug: "localized-settings" as never,
    data: data as never,
    ...options,
  });

const storedInEveryLocale = async (read: () => Promise<unknown>) =>
  (await read()) as Record<string, any>;

describe("localized saves read with a fallback locale", () => {
  it("clearing a localized field of a document in one locale is logged although another locale shows the same value", async () => {
    const user = await createUser(ctx.payload, "fallback-clear@example.com", { nickname: "Brand" });
    await updateUser(user.id, { nickname: "Brand" }, GERMAN);
    await startOfTheSavesUnderTest();

    await updateUser(user.id, { nickname: null }, GERMAN);

    const stored = await storedInEveryLocale(() =>
      ctx.payload.findByID({ collection: "users" as never, id: user.id, locale: "all" })
    );
    expect(stored.nickname).toEqual({ en: "Brand", de: null });
    expect(await userEventsOfThisTest(user.id)).toEqual([["doc.update", ["nickname"]]]);
  });

  it("setting a localized field of a global to the value another locale shows is logged", async () => {
    await updateLocalizedSettings({ motto: "Same" });
    await startOfTheSavesUnderTest();

    await updateLocalizedSettings({ motto: "Same" }, GERMAN);

    const stored = await storedInEveryLocale(() =>
      ctx.payload.findGlobal({ slug: "localized-settings" as never, locale: "all" })
    );
    expect(stored.motto).toEqual({ en: "Same", de: "Same" });
    expect(await globalEventsOfThisTest("localized-settings")).toEqual([
      ["global.update", ["motto"]],
    ]);
  });

  it("no-op saves in a locale that falls back are not logged", async () => {
    const user = await createUser(ctx.payload, "fallback-no-op@example.com", { nickname: "Brand" });
    await updateLocalizedSettings({ motto: "Same" });
    await updateLocalizedSettings({ motto: "Gleich" }, GERMAN);
    await startOfTheSavesUnderTest();

    await updateUser(user.id, { nickname: null }, GERMAN);
    await updateUser(user.id, { name: null }, GERMAN);
    await updateLocalizedSettings({ motto: "Gleich" }, GERMAN);
    await updateLocalizedSettings({}, GERMAN);

    expect(await userEventsOfThisTest(user.id)).toEqual([]);
    expect(await globalEventsOfThisTest("localized-settings")).toEqual([]);
  });
});

type RowsGlobal = { items: { id: string; label?: unknown }[] };

const updateGlobal = async (slug: string, data: Record<string, unknown>, options = {}) =>
  (await ctx.payload.updateGlobal({
    slug: slug as never,
    data: data as never,
    ...options,
  })) as unknown as RowsGlobal;

const postInGermanFallingBackToEnglish = async (slug: string, body: Record<string, unknown>) => {
  const res = await rest(ctx.payload, "POST", `/globals/${slug}?locale=de&fallback-locale=en`, {
    body,
    headers: signedIn,
  });
  expect(res.status).toBe(200);
};

const AS_DRAFT = { draft: true } as const;

describe("globals with drafts and rows saved with a fallback locale", () => {
  it("setting localized fields of a global with drafts to the values another locale shows is logged", async () => {
    const saved = await updateGlobal(
      "banner",
      { motto: "Same", items: [{ label: "Label" }] },
      AS_DRAFT
    );
    const rowId = saved.items[0]?.id;
    await startOfTheSavesUnderTest();

    await updateGlobal(
      "banner",
      { motto: "Same", items: [{ id: rowId, label: "Label" }] },
      { ...GERMAN, ...AS_DRAFT }
    );

    const stored = await storedInEveryLocale(() =>
      ctx.payload.findGlobal({ slug: "banner" as never, locale: "all", draft: true })
    );
    expect(stored.motto).toEqual({ en: "Same", de: "Same" });
    expect(await globalEventsOfThisTest("banner")).toEqual([
      ["global.update", ["motto", "items.0.label"]],
    ]);
  });

  it("no-op saves of a global with drafts in a locale that falls back are not logged", async () => {
    const saved = await updateGlobal(
      "banner",
      { motto: "Same", items: [{ label: "Label" }] },
      AS_DRAFT
    );
    const rowId = saved.items[0]?.id;
    await updateGlobal(
      "banner",
      { motto: "Gleich", items: [{ id: rowId, label: "Etikett" }] },
      { ...GERMAN, ...AS_DRAFT }
    );
    await startOfTheSavesUnderTest();

    await updateGlobal(
      "banner",
      { motto: "Gleich", items: [{ id: rowId, label: "Etikett" }] },
      { ...GERMAN, ...AS_DRAFT }
    );
    await updateGlobal("banner", {}, { ...GERMAN, ...AS_DRAFT });

    expect(await globalEventsOfThisTest("banner")).toEqual([]);
  });

  it("re-saving a localized row field of a global in a locale that falls back is logged as that field", async () => {
    const saved = await updateGlobal("localized-rows", { items: [{ label: "Label" }] });
    const rowId = saved.items[0]?.id;
    await startOfTheSavesUnderTest();

    await postInGermanFallingBackToEnglish("localized-rows", {
      items: [{ id: rowId, label: "Label" }],
    });

    const stored = await storedInEveryLocale(() =>
      ctx.payload.findGlobal({ slug: "localized-rows" as never, locale: "all" })
    );
    expect(stored.items[0].label).toEqual({ en: "Label", de: "Label" });
    expect(await globalEventsOfThisTest("localized-rows")).toEqual([
      ["global.update", ["items.0.label"]],
    ]);
  });

  it("no-op saves of a localized row field of a global in a locale that falls back are not logged", async () => {
    const saved = await updateGlobal("localized-rows", { items: [{ label: "Label" }] });
    const rowId = saved.items[0]?.id;
    await postInGermanFallingBackToEnglish("localized-rows", {
      items: [{ id: rowId, label: "Etikett" }],
    });
    await startOfTheSavesUnderTest();

    await postInGermanFallingBackToEnglish("localized-rows", {
      items: [{ id: rowId, label: "Etikett" }],
    });

    expect(await globalEventsOfThisTest("localized-rows")).toEqual([]);
  });
});

type RowsDoc = { id: string; badges?: { id: string }[]; sections?: { id: string }[] };

const patchInGerman = async (path: string, body: Record<string, unknown>) => {
  const res = await rest(ctx.payload, "PATCH", `/${path}?locale=de`, { body, headers: signedIn });
  expect(res.status).toBe(200);
};

const articleEventsOfThisTest = async (id: unknown) =>
  actionsAndChanges(await targetEvents(ctx.payload, "articles", id, testStartedAt));

const createArticleWithEnglishCaption = async () =>
  (await ctx.payload.create({
    collection: "articles" as never,
    data: {
      note: "Note",
      sections: [{ heading: "H", caption: "Caption" }],
      _status: "published",
    } as never,
  })) as unknown as RowsDoc;

describe("documents with localized row fields saved in a locale that falls back", () => {
  it("saves of a user that submit no row leave a localized row field set only in English unlogged", async () => {
    const user = (await createUser(ctx.payload, "fallback-rows@example.com", {
      badges: [{ blockType: "badge", label: "one", caption: "first" }],
    })) as unknown as RowsDoc;
    await startOfTheSavesUnderTest();

    await patchInGerman(`users/${user.id}`, {});
    await patchInGerman(`users/${user.id}`, { name: "Same" });

    expect(await userEventsOfThisTest(user.id)).toEqual([["doc.update", ["name"]]]);
  });

  it("setting a localized row field of a user in German is logged as that field", async () => {
    const user = (await createUser(ctx.payload, "fallback-rows-change@example.com", {
      badges: [{ blockType: "badge", label: "one", caption: "first" }],
    })) as unknown as RowsDoc;
    const badgeId = user.badges?.[0]?.id;
    await startOfTheSavesUnderTest();

    await patchInGerman(`users/${user.id}`, {
      badges: [{ id: badgeId, blockType: "badge", label: "one", caption: "erste" }],
    });

    expect(await userEventsOfThisTest(user.id)).toEqual([["doc.update", ["badges.0.caption"]]]);
  });

  it("saves and publishes of a document with drafts that submit no row leave a localized row field set only in English unlogged", async () => {
    const article = await createArticleWithEnglishCaption();
    await startOfTheSavesUnderTest();

    await patchInGerman(`articles/${article.id}`, {});
    await patchInGerman(`articles/${article.id}`, { _status: "published" });

    expect(await articleEventsOfThisTest(article.id)).toEqual([]);
  });

  it("setting a localized row field of a document with drafts in German is logged as that field", async () => {
    const article = await createArticleWithEnglishCaption();
    const sectionId = article.sections?.[0]?.id;
    await startOfTheSavesUnderTest();

    await patchInGerman(`articles/${article.id}`, {
      sections: [{ id: sectionId, heading: "H", caption: "Untertitel" }],
    });

    expect(await articleEventsOfThisTest(article.id)).toEqual([
      ["doc.update", ["sections.0.caption"]],
    ]);
  });
});

describe("localized values a field hook stores in a locale that falls back", () => {
  const createInEnglish = async (collection: string, data: Record<string, unknown>) =>
    (await ctx.payload.create({
      collection: collection as never,
      locale: "en",
      data: data as never,
    })) as unknown as { id: string };

  const patchInGermanWithoutFallback = async (path: string, body: Record<string, unknown>) => {
    const res = await rest(ctx.payload, "PATCH", `/${path}?locale=de&fallback-locale=none`, {
      body,
      headers: signedIn,
    });
    expect(res.status).toBe(200);
  };

  const saveInGermanWithAndWithoutFallback = async (
    collection: string,
    id: string,
    bodies: { withFallback: Record<string, unknown>; withoutFallback: Record<string, unknown> }
  ) => {
    const eventsOf = async () =>
      actionsAndChanges(await targetEvents(ctx.payload, collection, id, testStartedAt));
    await startOfTheSavesUnderTest();
    await patchInGerman(`${collection}/${id}`, bodies.withFallback);
    const withFallback = await eventsOf();
    await startOfTheSavesUnderTest();
    await patchInGermanWithoutFallback(`${collection}/${id}`, bodies.withoutFallback);
    return { withFallback, withoutFallback: await eventsOf() };
  };

  it("a field another field's hook derives is logged, as without a fallback locale", async () => {
    const doc = await createInEnglish("summarized", { title: "hello" });

    const saves = await saveInGermanWithAndWithoutFallback("summarized", doc.id, {
      withFallback: { title: "hallo" },
      withoutFallback: { title: "hallo2" },
    });

    expect(saves).toEqual({
      withFallback: [["doc.update", ["title", "summary"]]],
      withoutFallback: [["doc.update", ["title", "summary"]]],
    });
  });

  it("a change made only by a field hook is logged", async () => {
    const doc = await createInEnglish("revisioned", { title: "hello" });
    await ctx.payload.update({
      collection: "revisioned" as never,
      id: doc.id,
      data: { title: "hallo" } as never,
      locale: "de",
    });

    const unchangedTitle = { title: "hallo" };
    const saves = await saveInGermanWithAndWithoutFallback("revisioned", doc.id, {
      withFallback: unchangedTitle,
      withoutFallback: unchangedTitle,
    });

    expect(saves).toEqual({
      withFallback: [["doc.update", ["revision"]]],
      withoutFallback: [["doc.update", ["revision"]]],
    });
  });

  it("a submitted value a field hook normalizes to the stored one is not logged", async () => {
    const doc = await createInEnglish("codes", { code: "EN" });
    await ctx.payload.update({
      collection: "codes" as never,
      id: doc.id,
      data: { code: "DE" } as never,
      locale: "de",
    });

    const unnormalizedCode = { code: " de " };
    const saves = await saveInGermanWithAndWithoutFallback("codes", doc.id, {
      withFallback: unnormalizedCode,
      withoutFallback: unnormalizedCode,
    });

    expect(saves).toEqual({ withFallback: [], withoutFallback: [] });
  });
});

import type { CollectionConfig, Field, GlobalConfig } from "payload";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { bootAuditPayload, events, timestampAfterEverythingSoFar } from "./bootAuditPayload";
import type { AuditEventRow, AuditTestPayload } from "./bootAuditPayload";

const TABBED_NOTES = "tabbed-notes";
const TABBED_SETTINGS = "tabbed-settings";
const GERMAN = { locale: "de" } as const;

const fieldsWithLocalizedNamedTab: Field[] = [
  { name: "code", type: "text" },
  {
    type: "tabs",
    tabs: [
      { name: "meta", localized: true, fields: [{ name: "title", type: "text" }] },
      { label: "Plain", fields: [{ name: "note", type: "text" }] },
    ],
  },
];

const collections: CollectionConfig[] = [
  { slug: TABBED_NOTES, fields: fieldsWithLocalizedNamedTab },
];
const globals: GlobalConfig[] = [{ slug: TABBED_SETTINGS, fields: fieldsWithLocalizedNamedTab }];

let ctx: AuditTestPayload;
beforeAll(async () => {
  ctx = await bootAuditPayload({ localizationFallback: true, collections, globals });
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

const changesAndLocales = (log: AuditEventRow[]) =>
  log.map((event) => [event.action, event.changes, event.target.locale ?? null]);

const eventsOfThisTest = async (slug: string) =>
  changesAndLocales(
    await events(ctx.payload, {
      and: [
        { "target.slug": { equals: slug } },
        { occurredAt: { greater_than_equal: testStartedAt } },
      ],
    })
  );

const createNote = (data: Record<string, unknown>) =>
  ctx.payload.create({ collection: TABBED_NOTES as never, data: data as never });

const updateNote = (id: unknown, data: Record<string, unknown>) =>
  ctx.payload.update({
    collection: TABBED_NOTES as never,
    id: id as string,
    data: data as never,
    ...GERMAN,
  });

const updateSettings = (data: Record<string, unknown>, options = {}) =>
  ctx.payload.updateGlobal({ slug: TABBED_SETTINGS as never, data: data as never, ...options });

describe("a collection whose only localized field is a named tab", () => {
  it("records the locale of a save", async () => {
    const note = await createNote({ code: "c", meta: { title: "Same" } });
    await startOfTheSavesUnderTest();

    await updateNote(note.id, { code: "c2" });

    expect(await eventsOfThisTest(TABBED_NOTES)).toEqual([["doc.update", ["code"], "de"]]);
  });

  it("logs setting the tab in one locale to the value another locale shows", async () => {
    const note = await createNote({ code: "c", meta: { title: "Same" } });
    await startOfTheSavesUnderTest();

    await updateNote(note.id, { meta: { title: "Same" } });

    const stored = (await ctx.payload.findByID({
      collection: TABBED_NOTES as never,
      id: note.id,
      locale: "all",
    })) as unknown as Record<string, unknown>;
    expect(stored.meta).toEqual({ en: { title: "Same" }, de: { title: "Same" } });
    expect(await eventsOfThisTest(TABBED_NOTES)).toEqual([["doc.update", ["meta.title"], "de"]]);
  });
});

describe("a global whose only localized field is a named tab", () => {
  it("logs setting the tab in one locale to the value another locale shows", async () => {
    await updateSettings({ code: "c", meta: { title: "Shared" } });
    await startOfTheSavesUnderTest();

    await updateSettings({ meta: { title: "Shared" } }, GERMAN);

    const stored = (await ctx.payload.findGlobal({
      slug: TABBED_SETTINGS as never,
      locale: "all",
    })) as unknown as Record<string, unknown>;
    expect(stored.meta).toEqual({ en: { title: "Shared" }, de: { title: "Shared" } });
    expect(await eventsOfThisTest(TABBED_SETTINGS)).toEqual([["global.update", ["meta"], "de"]]);
  });

  it("records the locale of a save", async () => {
    await updateSettings({ meta: { title: "Eigen" } }, GERMAN);
    await startOfTheSavesUnderTest();

    await updateSettings({ code: "c2" }, GERMAN);

    expect(await eventsOfThisTest(TABBED_SETTINGS)).toEqual([["global.update", ["code"], "de"]]);
  });
});

import type { Block, CollectionConfig, Field, GlobalConfig } from "payload";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  bootAuditPayload,
  events,
  targetEvents,
  timestampAfterEverythingSoFar,
} from "./bootAuditPayload";
import type { AuditEventRow, AuditTestPayload } from "./bootAuditPayload";

const GERMAN = { locale: "de" } as const;

const hero: Block = {
  slug: "hero",
  fields: [{ name: "heading", type: "text", localized: true }],
};

const inlineLayout: Field = { name: "layout", type: "blocks", blocks: [hero] };
const referencedLayout: Field = {
  name: "layout",
  type: "blocks",
  blocks: [],
  blockReferences: ["hero"],
};

const pageFields = (layout: Field): Field[] => [{ name: "code", type: "text" }, layout];

const collections: CollectionConfig[] = [
  { slug: "inline-pages", fields: pageFields(inlineLayout) },
  { slug: "referenced-pages", fields: pageFields(referencedLayout) },
];

const globals: GlobalConfig[] = [
  { slug: "inline-home", fields: pageFields(inlineLayout) },
  { slug: "referenced-home", fields: pageFields(referencedLayout) },
];

let ctx: AuditTestPayload;
beforeAll(async () => {
  ctx = await bootAuditPayload({
    localizationFallback: true,
    blocks: [hero],
    collections,
    globals,
  });
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

const actionsLocalesAndChanges = (log: AuditEventRow[]) =>
  log.map((event) => [event.action, event.target.locale ?? null, event.changes]);

type Page = { id: string; layout: { id: string }[] };

describe.each([
  { described: "inline blocks", pages: "inline-pages", home: "inline-home" },
  {
    described: "blocks referenced from the config",
    pages: "referenced-pages",
    home: "referenced-home",
  },
])("localized fields that live only in $described", ({ pages, home }) => {
  const createPage = async () =>
    (await ctx.payload.create({
      collection: pages as never,
      data: { code: "c", layout: [{ blockType: "hero", heading: "Hello" }] } as never,
    })) as unknown as Page;

  const updatePageInGerman = (id: string, data: Record<string, unknown>) =>
    ctx.payload.update({ collection: pages as never, id, data: data as never, ...GERMAN });

  const pageEventsOfThisTest = async (id: string) =>
    actionsLocalesAndChanges(await targetEvents(ctx.payload, pages, id, testStartedAt));

  const homeEventsOfThisTest = async () =>
    actionsLocalesAndChanges(
      await events(ctx.payload, {
        and: [
          { "target.kind": { equals: "global" } },
          { "target.slug": { equals: home } },
          { occurredAt: { greater_than_equal: testStartedAt } },
        ],
      })
    );

  it("a save in a locale that falls back records its locale and only the field it changed", async () => {
    const page = await createPage();
    await startOfTheSavesUnderTest();

    await updatePageInGerman(page.id, { code: "x" });

    expect(await pageEventsOfThisTest(page.id)).toEqual([["doc.update", "de", ["code"]]]);
  });

  it("clearing a localized block field in one locale is logged although the other locale shows the same value", async () => {
    const page = await createPage();
    const [row] = page.layout;
    await updatePageInGerman(page.id, {
      layout: [{ id: row?.id, blockType: "hero", heading: "Hallo" }],
    });
    await startOfTheSavesUnderTest();

    await updatePageInGerman(page.id, {
      layout: [{ id: row?.id, blockType: "hero", heading: null }],
    });

    expect(await pageEventsOfThisTest(page.id)).toEqual([
      ["doc.update", "de", ["layout.0.heading"]],
    ]);
  });

  it("a global save in a locale that falls back records its locale and the fallback values Payload stores in it", async () => {
    await ctx.payload.updateGlobal({
      slug: home as never,
      data: { code: "c", layout: [{ blockType: "hero", heading: "Hello" }] } as never,
    });
    await startOfTheSavesUnderTest();

    await ctx.payload.updateGlobal({
      slug: home as never,
      data: { code: "x" } as never,
      ...GERMAN,
    });

    const stored = (await ctx.payload.findGlobal({
      slug: home as never,
      locale: "all",
    })) as unknown as { layout: { heading: unknown }[] };
    expect(stored.layout[0]?.heading).toEqual({ en: "Hello", de: "Hello" });
    expect(await homeEventsOfThisTest()).toEqual([
      ["global.update", "de", ["code", "layout.0.heading"]],
    ]);
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CollectionAfterChangeHook, CollectionConfig, Where } from "payload";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { buildTestCollections } from "./testCollections";

// The platform assumptions the baseline read rests on, asserted against a real Payload rather than
// read off its source, so an upgrade that moves one of them turns this file red: the version row
// for the save in flight is already written when a collection `afterChange` hook runs, filtering on
// published status is what separates the previous publish from the draft being published, and the
// read answers in the locale it is handed.
//
// Which row counts as the current publish is Payload's own answer rather than this plugin's: the
// admin finds it with the same query — published status, newest by `-updatedAt` — in
// `@payloadcms/next`, `views/Version/fetchVersions.js`, and so does `payload` itself in
// `versions/getLatestCollectionVersion.js`.

type RowSummary = { status: unknown; title: unknown };

type Capture = {
  filtered: RowSummary[];
  unfiltered: RowSummary[];
  /** Read at a fixed locale rather than the request's, the way the shipped read passes the source locale. */
  alwaysEnglish: RowSummary[];
  requestLocale: unknown;
};

const captures: Capture[] = [];

const summarise = (rows: { version: Record<string, unknown> }[]): RowSummary[] =>
  rows.map((row) => ({ status: row.version._status, title: row.version.title }));

const publishedOnly = (id: unknown): Where => ({
  and: [{ parent: { equals: id } }, { "version._status": { equals: "published" } }],
});

const captureHistory: CollectionAfterChangeHook = async ({ doc, req }) => {
  const transactionID = await req.transactionID;
  const scope = transactionID == null ? {} : { transactionID };
  const common = {
    collection: "docs" as const,
    sort: "-updatedAt",
    limit: 2,
    locale: req.locale,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req: scope,
  };

  const filtered = await req.payload.findVersions({ ...common, where: publishedOnly(doc.id) });
  const unfiltered = await req.payload.findVersions({
    ...common,
    where: { parent: { equals: doc.id } },
  });
  const alwaysEnglish = await req.payload.findVersions({
    ...common,
    locale: "en",
    where: publishedOnly(doc.id),
  });

  captures.push({
    filtered: summarise(filtered.docs),
    unfiltered: summarise(unfiltered.docs),
    alwaysEnglish: summarise(alwaysEnglish.docs),
    requestLocale: req.locale,
  });
};

const withCapture = (): CollectionConfig[] =>
  buildTestCollections().map((collection) =>
    collection.slug === "docs"
      ? { ...collection, hooks: { ...collection.hooks, afterChange: [captureHistory] } }
      : collection
  );

let ctx: TestPayload;

const create = (data: Record<string, unknown>, locale = "en") =>
  ctx.payload.create({ collection: "docs", locale, data });

const update = (id: string, data: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
  ctx.payload.update({ collection: "docs", id, locale: "en", data, ...extra });

describe("the version history a collection hook can already see", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({ collections: withCapture() });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("answers the publish in flight at index 0 and the previous publish at index 1", async () => {
    const made = await create({ _status: "published", title: "First text" });
    const id = String(made.id);

    await update(id, { title: "Second text" }, { draft: true });

    captures.length = 0;
    await update(id, { _status: "published" });

    expect(captures).toHaveLength(1);
    const { filtered } = captures[0];

    expect(filtered).toStrictEqual([
      { status: "published", title: "Second text" },
      { status: "published", title: "First text" },
    ]);
  });

  it("would read the draft being published as the previous version without the status filter", async () => {
    const made = await create({ _status: "published", title: "Alpha" });
    const id = String(made.id);

    await update(id, { title: "Beta" }, { draft: true });

    captures.length = 0;
    await update(id, { _status: "published" });

    const { unfiltered } = captures[0];

    // Index 1 is the draft holding the very text being published, so a comparison against it reads
    // equal and the defect this read exists to fix survives.
    expect(unfiltered[1]).toStrictEqual({ status: "draft", title: "Beta" });
  });

  it("reads the locale it was handed, not the one the save is running in", async () => {
    const made = await create({ _status: "published", title: "English text" });
    const id = String(made.id);

    captures.length = 0;
    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "de",
      data: { _status: "published", title: "Deutscher Text" },
    });

    expect(captures).toHaveLength(1);
    const duringGermanSave = captures[0];
    expect(duringGermanSave.requestLocale).toBe("de");

    // Reading at the request's own locale answers German; the same rows read at an explicit `en`
    // answer English. The shipped baseline passes the source locale, so it is the second that counts.
    expect(duringGermanSave.filtered[0]).toStrictEqual({
      status: "published",
      title: "Deutscher Text",
    });
    expect(duringGermanSave.alwaysEnglish[0]).toStrictEqual({
      status: "published",
      title: "English text",
    });
  });
});

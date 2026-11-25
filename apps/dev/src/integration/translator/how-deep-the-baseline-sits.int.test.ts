import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CollectionAfterChangeHook, CollectionConfig, Where } from "payload";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { buildTestCollections } from "./testCollections";

// How much version history the baseline read needs, measured against a real Payload with the plugin
// writing its own target-locale rows into the same history.
//
// `versions.maxPerDoc` retains the newest rows and deletes the rest by age, so the previous publish
// survives pruning exactly while it stays within that many rows of the newest. What decides that is
// not how long the history is but how many rows are written between the previous publish and the
// moment the hook reads — the distance these cases count.

type RowSummary = {
  status: unknown;
  publishedLocale: string | undefined;
  snapshot: boolean | undefined;
};

type WindowAtTheHook = {
  /** Every version row of the document, newest first, as the hook sees them. */
  rows: RowSummary[];
  /**
   * Position of the row the baseline read answers with, counting the newest row as 1 — the smallest
   * `maxPerDoc` that would still retain it. `null` when there is no previous publish.
   */
  baselineDepth: number | null;
};

const captures: WindowAtTheHook[] = [];

const publishedOnly = (id: unknown): Where => ({
  and: [{ parent: { equals: id } }, { "version._status": { equals: "published" } }],
});

/**
 * Only the editor's own save is captured. The plugin writes at the target locales, so filtering on
 * the request's locale separates the save under measurement from the writes it causes.
 */
const captureWindow: CollectionAfterChangeHook = async ({ doc, req }) => {
  if (req.locale !== "en") return;

  const transactionID = await req.transactionID;
  const common = {
    collection: "docs" as const,
    sort: "-updatedAt",
    locale: "en",
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req: transactionID == null ? {} : { transactionID },
  };

  const all = await req.payload.findVersions({
    ...common,
    where: { parent: { equals: doc.id } },
    limit: 1000,
  });
  const published = await req.payload.findVersions({
    ...common,
    where: publishedOnly(doc.id),
    limit: 2,
  });

  const baselineId = published.docs[1]?.id;
  const position = all.docs.findIndex((row) => row.id === baselineId);

  captures.push({
    rows: all.docs.map((row) => ({
      status: row.version._status,
      publishedLocale: row.publishedLocale,
      snapshot: row.snapshot,
    })),
    baselineDepth: position === -1 ? null : position + 1,
  });
};

const withCapture = (): CollectionConfig[] =>
  buildTestCollections().map((collection) =>
    collection.slug === "docs"
      ? { ...collection, hooks: { ...collection.hooks, afterChange: [captureWindow] } }
      : collection
  );

let ctx: TestPayload;

const TARGETS = ["de", "fr", "es"];

/**
 * The distance measured below. It is three because the plugin's last target-locale publish is itself
 * a published row: at the hook's moment the newest rows are the publish in flight, the snapshot that
 * publish of the last target left behind, and that target's published row — the baseline. The count
 * is therefore independent of how many target locales are configured.
 */
const BASELINE_DEPTH = 3;

const rowsOf = async (id: string): Promise<number> => {
  const all = await ctx.payload.findVersions({
    collection: "docs",
    where: { parent: { equals: id } },
    limit: 1000,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  });
  return all.docs.length;
};

const publishText = (id: string, title: string) =>
  ctx.payload.update({
    collection: "docs",
    id,
    locale: "en",
    data: { _status: "published", title },
  });

const saveDraft = (id: string, title: string) =>
  ctx.payload.update({ collection: "docs", id, locale: "en", draft: true, data: { title } });

const published = (title: string) =>
  ctx.payload.create({ collection: "docs", locale: "en", data: { _status: "published", title } });

describe("how deep in the version window the baseline sits", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      collections: withCapture(),
      autoTranslate: { targets: TARGETS },
    });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("writes three version rows per target locale against the editor's one", async () => {
    const made = await published("First text");
    const id = String(made.id);

    const before = await rowsOf(id);
    await publishText(id, "Second text");

    // One editor publish with three targets wrote ten rows: the editor's own, and per target a draft
    // save, a published row and the snapshot Payload writes alongside a single-locale publish.
    expect((await rowsOf(id)) - before).toBe(1 + 3 * TARGETS.length);
  });

  it("answers the baseline three rows from the newest", async () => {
    const made = await published("Alpha");
    const id = String(made.id);

    captures.length = 0;
    await publishText(id, "Beta");

    expect(captures).toHaveLength(1);
    const { rows, baselineDepth } = captures[0];

    expect(baselineDepth).toBe(BASELINE_DEPTH);
    expect(rows.slice(0, BASELINE_DEPTH)).toStrictEqual([
      { status: "published", publishedLocale: null, snapshot: null },
      { status: "draft", publishedLocale: "es", snapshot: true },
      { status: "published", publishedLocale: "es", snapshot: null },
    ]);
  });

  it("stays at that distance however long the history grows", async () => {
    const made = await published("One");
    const id = String(made.id);

    const depths: (number | null)[] = [];
    for (const title of ["Two", "Three", "Four", "Five", "Six"]) {
      captures.length = 0;
      await publishText(id, title);
      depths.push(captures[0]?.baselineDepth ?? null);
    }

    // The decisive measurement: the history grows with every publish, the distance to the baseline
    // does not. A `maxPerDoc` above that distance retains the baseline however long a document lives.
    expect(depths).toStrictEqual([3, 3, 3, 3, 3]);
    expect(await rowsOf(id)).toBeGreaterThan(BASELINE_DEPTH * 10);
  });

  it("sinks one row per hand-saved draft, which is the only way pruning can reach it", async () => {
    const made = await published("Start");
    const id = String(made.id);
    await publishText(id, "Settled");

    const handSaves = 4;
    for (let n = 0; n < handSaves; n += 1) await saveDraft(id, `Working ${n}`);

    captures.length = 0;
    await publishText(id, "Settled");

    expect(captures[0]?.baselineDepth).toBe(BASELINE_DEPTH + handSaves);
  });
});

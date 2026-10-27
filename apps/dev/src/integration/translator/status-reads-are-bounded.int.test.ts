import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

let ctx: TestPayload;

const JOBS = "payload-jobs" as "docs";
const RUNS = "translator-runs" as "docs";
const WORKFLOW = "translate_document_locales";
const QUEUE = "translations";

type RunRow = { id: unknown; collectionSlug?: unknown; collectionId?: unknown };

/**
 * The endpoints narrow after the read, so their answer is identical whether or not the read was
 * bounded; only the read itself shows how much came back.
 */
let runRowsPerRead: RunRow[][] = [];
let restore: (() => void) | undefined;

const watchRunReads = () => {
  const real = ctx.payload.find.bind(ctx.payload);
  runRowsPerRead = [];
  ctx.payload.find = (async (args: { collection: string }) => {
    const result = await real(args as Parameters<typeof real>[0]);
    if (args.collection === RUNS) runRowsPerRead.push(result.docs as unknown as RunRow[]);
    return result;
  }) as typeof ctx.payload.find;
  restore = () => {
    ctx.payload.find = real;
  };
};

const rowsRead = (): RunRow[] => runRowsPerRead.flat();

const create = async (title: string): Promise<string> => {
  const made = await ctx.payload.create({
    collection: "docs",
    locale: "en",
    data: { _status: "published", title, note: "A note" },
  });
  return String(made.id);
};

const enqueue = async (ids: string[], locales: string[]): Promise<void> => {
  await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: locales,
      collection_slug: "docs",
      collection_id: ids,

      publish_on_translation: false,
    },
  });
};

const seedForeignRun = async (collectionSlug: string): Promise<void> => {
  await ctx.payload.create({
    collection: RUNS,
    data: {
      handle: `foreign-${collectionSlug}`,
      collectionSlug,
      collectionId: "999",
      sourceLng: "en",
      targetLng: "de",
      publishOnTranslation: false,
      queuedAt: new Date().toISOString(),
    },
  } as never);
};

const slugOf = (row: RunRow): unknown => row.collectionSlug;

const documentOf = (row: RunRow): unknown => row.collectionId;

describe("the status endpoints read only what they answer about", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({ runner: createPayloadJobsRunner({ autoRun: false }) });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });
  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  it("loads no run row belonging to another collection", async () => {
    const id = await create("Ours");
    await enqueue([id], ["de"]);
    await seedForeignRun("somewhere-else");

    watchRunReads();
    await callEndpoint(ctx.payload, "get", "/translate/collection/:collection_slug", {
      routeParams: { collection_slug: "docs" },
    });

    expect(rowsRead().length, "the read happened at all").toBeGreaterThan(0);
    expect(
      rowsRead()
        .map(slugOf)
        .filter((slug) => slug === "somewhere-else"),
      "another collection's history is not this collection's panel to pay for"
    ).toEqual([]);
  });

  it("loads only the asked document's rows", async () => {
    const asked = await create("Asked about");
    const other = await create("Not asked about");
    await enqueue([asked, other], ["de"]);

    watchRunReads();
    await callEndpoint(ctx.payload, "get", "/translate/document/:collection_slug/:collection_id", {
      routeParams: { collection_slug: "docs", collection_id: asked },
    });

    const rowsForOthers = rowsRead().filter((row) => documentOf(row) !== asked);
    expect(rowsRead().length, "the read happened at all").toBeGreaterThan(0);
    expect(
      rowsForOthers.map(documentOf),
      "one document's panel does not read another document's runs"
    ).toEqual([]);
  });

  it("reports a locale whose run is older than every other locale's run", async () => {
    const id = await create("Skewed history");

    await enqueue([id], ["fr"]);
    for (let i = 0; i < 3; i++) await enqueue([id], ["de"]);

    const res = await callEndpoint(
      ctx.payload,
      "get",
      "/translate/document/:collection_slug/:collection_id",
      { routeParams: { collection_slug: "docs", collection_id: id } }
    );

    const body = res.data as { data: Array<{ input: { target_lng: string } }> };
    expect(
      body.data.map((task) => task.input.target_lng),
      "a count bound would have dropped the oldest locale; a document bound must not"
    ).toContain("fr");
  });
});

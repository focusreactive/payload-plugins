import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

let ctx: TestPayload;

const JOBS = "payload-jobs" as "docs";
const WORKFLOW = "translate_document_locales";
const QUEUE = "translations";

type JobRow = { id: unknown; input?: Record<string, unknown> };

/**
 * Every job row the plugin pulled out of the database while serving one request.
 *
 * The endpoints' answers cannot show this: today they narrow after the read, so a correct answer is
 * exactly what an unbounded read produces. What the work changes is how much came back, which is
 * only visible from the read itself.
 */
let loaded: JobRow[][] = [];
let restore: (() => void) | undefined;

const watchJobReads = () => {
  const real = ctx.payload.find.bind(ctx.payload);
  loaded = [];
  ctx.payload.find = (async (args: { collection: string }) => {
    const result = await real(args as Parameters<typeof real>[0]);
    if (args.collection === JOBS) loaded.push(result.docs as unknown as JobRow[]);
    return result;
  }) as typeof ctx.payload.find;
  restore = () => {
    ctx.payload.find = real;
  };
};

const rowsRead = (): JobRow[] => loaded.flat();

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

/**
 * A row as the plugin wrote them before document references became ID-agnostic.
 *
 * `storedAs` writes the id through the adapter rather than through the field, which is the only way
 * to produce the shape that matters here: a legacy id stored as a **number**. Measured on all three
 * adapters, a `where` comparing such a value against a document id finds nothing — so a document
 * narrowing that matched the legacy id would drop the row silently.
 */
const seedLegacyRow = async (
  collectionSlug: string,
  documentId: string,
  storedAs?: unknown,
  targetLng = "de"
): Promise<void> => {
  const input = {
    collection: { relationTo: collectionSlug, value: documentId },
    source_lng: "en",
    targets: [{ lng: targetLng }],
  };
  const row = await ctx.payload.create({
    collection: JOBS,
    data: { workflowSlug: WORKFLOW, queue: QUEUE, input },
  } as never);
  if (storedAs === undefined) return;
  await ctx.payload.db.updateOne({
    collection: JOBS,
    id: (row as { id: unknown }).id,
    data: { input: { ...input, collection: { relationTo: collectionSlug, value: storedAs } } },
    returning: false,
  } as never);
};

const seedForeignRow = async (collectionSlug: string): Promise<void> => {
  await ctx.payload.create({
    collection: JOBS,
    data: {
      workflowSlug: WORKFLOW,
      queue: QUEUE,
      input: {
        collection_slug: collectionSlug,
        collection_id: "999",
        source_lng: "en",
        targets: [{ lng: "de" }],
      },
    },
  } as never);
};

/** SQL ids are integers; Mongo ids are strings, where the number case cannot arise. */
const numericIfPossible = (id: string): unknown => (/^\d+$/u.test(id) ? Number(id) : id);

const slugOf = (row: JobRow): unknown =>
  row.input?.collection_slug ?? (row.input?.collection as { relationTo?: unknown })?.relationTo;

const documentOf = (row: JobRow): unknown =>
  row.input?.collection_id ?? (row.input?.collection as { value?: unknown })?.value;

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

  it("loads no job row belonging to another collection", async () => {
    const id = await create("Ours");
    await enqueue([id], ["de"]);
    await seedForeignRow("somewhere-else");

    watchJobReads();
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

  it("still finds a row written in the legacy relationship shape", async () => {
    const id = await create("Legacy");
    await seedLegacyRow("docs", id);

    const res = await callEndpoint(ctx.payload, "get", "/translate/collection/:collection_slug", {
      routeParams: { collection_slug: "docs" },
    });

    const docs = (res.data as { data: { docs: Array<{ collection_id: string }> } }).data.docs;
    expect(
      docs.map((entry) => entry.collection_id),
      "rows written before the ID-agnostic migration still answer"
    ).toContain(id);
  });

  it("finds a legacy row by document whichever way its id was stored", async () => {
    const id = await create("Legacy, asked by document");
    await seedLegacyRow("docs", id, id, "de");
    await seedLegacyRow("docs", id, numericIfPossible(id), "fr");

    const res = await callEndpoint(
      ctx.payload,
      "get",
      "/translate/document/:collection_slug/:collection_id",
      { routeParams: { collection_slug: "docs", collection_id: id } }
    );

    const body = res.data as { data: Array<{ input: { target_lng: string } }> };
    expect(
      body.data.map((task) => task.input.target_lng).sort(),
      "a relationship field stored a numeric collection's id as a number; the narrowing must offer both forms"
    ).toEqual(["de", "fr"]);
  });

  it("loads only the asked document's rows, for rows written in the flat shape", async () => {
    const asked = await create("Asked about");
    const other = await create("Not asked about");
    await enqueue([asked, other], ["de"]);

    watchJobReads();
    await callEndpoint(ctx.payload, "get", "/translate/document/:collection_slug/:collection_id", {
      routeParams: { collection_slug: "docs", collection_id: asked },
    });

    const flatRowsForOthers = rowsRead().filter(
      (row) => row.input?.collection_slug !== undefined && documentOf(row) !== asked
    );
    expect(rowsRead().length, "the read happened at all").toBeGreaterThan(0);
    expect(
      flatRowsForOthers.map(documentOf),
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

import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload, CRON_BATCH_LIMIT } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

let ctx: TestPayload;

const JOBS = "payload-jobs" as "docs";
const RUNS = "translator-runs" as "docs";
const WORKFLOW = "translate_document_locales";

type Row = { handle: string; targetLng: string; outcome: string | null; collectionId: string };

const create = async (title: string): Promise<string> => {
  const made = await ctx.payload.create({
    collection: "docs",
    locale: "en",
    data: { _status: "published", title, note: "A note" },
  });
  return String(made.id);
};

/** A row in the shape the plugin wrote before 1.0: the whole run, and no handle. */
const seedPreUpgradeJob = async (
  documentId: string,
  input: Record<string, unknown>
): Promise<string> => {
  const row = await ctx.payload.create({
    collection: JOBS,
    data: {
      workflowSlug: WORKFLOW,
      queue: "translations",
      input: {
        collection_slug: "docs",
        collection_id: documentId,
        source_lng: "en",
        ...input,
      },
    },
  } as never);
  return String((row as { id: unknown }).id);
};

const rowsFor = async (documentId: string): Promise<Row[]> => {
  const found = await ctx.payload.find({
    collection: RUNS,
    where: { collectionId: { equals: documentId } },
    pagination: false,
    sort: "targetLng",
  });
  return found.docs as unknown as Row[];
};

const jobInput = async (id: string): Promise<Record<string, unknown>> => {
  const job = (await ctx.payload.findByID({ collection: JOBS, id })) as { input?: unknown };
  return (job.input ?? {}) as Record<string, unknown>;
};

const runTheQueue = () => ctx.payload.jobs.run({ queue: "translations", limit: CRON_BATCH_LIMIT });

/** What the plugin does at boot, driven by hand so a row can be seeded first. */
const bootAgain = async () => {
  const onInit = ctx.payload.config.onInit;
  if (onInit) await onInit(ctx.payload);
};

describe("a job queued before the upgrade", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({ runner: createPayloadJobsRunner({ autoRun: false }) });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("is adopted when the queue reaches it, with no boot in between", async () => {
    const id = await create("Queued before the upgrade");
    await seedPreUpgradeJob(id, { targets: [{ lng: "de", filters: [] }] });

    await runTheQueue();

    const rows = await rowsFor(id);
    expect(rows.map((row) => row.targetLng)).toEqual(["de"]);
    expect(rows[0].outcome, "and it ran").toBe("delivered");
  });

  it("is adopted at boot, independently of anything running it", async () => {
    const id = await create("Adopted at boot");
    await seedPreUpgradeJob(id, { targets: [{ lng: "fr", filters: [] }] });

    await bootAgain();

    const rows = await rowsFor(id);
    expect(rows.map((row) => row.targetLng)).toEqual(["fr"]);
    expect(rows[0].outcome, "adoption records the run; it does not run it").toBeNull();
  });

  it("carries its pointer afterwards, so nothing reads the old shape twice", async () => {
    const id = await create("Pointer afterwards");
    const jobId = await seedPreUpgradeJob(id, { targets: [{ lng: "de", filters: [] }] });

    await bootAgain();

    expect(await jobInput(jobId)).toMatchObject({ handle: jobId, locales: ["de"] });
  });

  it("leaves one row per locale when it is adopted twice", async () => {
    const id = await create("Adopted twice");
    await seedPreUpgradeJob(id, { targets: [{ lng: "de", filters: [] }] });

    await bootAgain();
    await bootAgain();

    expect(await rowsFor(id)).toHaveLength(1);
  });

  it("answers the document panel once it has been adopted", async () => {
    const id = await create("Answers the panel");
    await seedPreUpgradeJob(id, { targets: [{ lng: "de", filters: [] }] });
    await bootAgain();

    const res = await callEndpoint(
      ctx.payload,
      "get",
      "/translate/document/:collection_slug/:collection_id",
      { routeParams: { collection_slug: "docs", collection_id: id } }
    );

    const rows = (res.data as { data: Array<{ status: string }> }).data;
    expect(rows.map((row) => row.status)).toEqual(["pending"]);
  });

  it("is cancellable by the handle it has always had — its own id", async () => {
    const id = await create("Cancelled after adoption");
    const jobId = await seedPreUpgradeJob(id, { targets: [{ lng: "de", filters: [] }] });
    await bootAgain();

    const response = await callEndpoint(ctx.payload, "delete", "/translate/cancel", {
      body: { ids: [jobId] },
    });

    expect(response.status).toBe(204);
    const [row] = await rowsFor(id);
    expect(row.outcome).toBe("cancelled");
  });

  it("keeps the locale list a pre-1.0 row named in `target_lngs`", async () => {
    const id = await create("The older locale list");
    await seedPreUpgradeJob(id, { target_lngs: ["de", "fr"], strategy: "overwrite" });

    await bootAgain();

    expect((await rowsFor(id)).map((row) => row.targetLng)).toEqual(["de", "fr"]);
  });
});

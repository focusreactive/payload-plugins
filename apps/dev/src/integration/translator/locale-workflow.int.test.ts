import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload, CRON_BATCH_LIMIT } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

// Must boot the real jobs runner: `createSyncRunner` translates inline and in order, so the fan-out
// this file guards against cannot occur under it.

const rev = (s: string) => [...s].reverse().join("");

let ctx: TestPayload;

beforeAll(async () => {
  ctx = await bootTestPayload({ runner: createPayloadJobsRunner({ autoRun: false }) });
});
afterAll(async () => {
  await ctx?.cleanup();
});

const createDoc = async (title: string) => {
  const doc = await ctx.payload.create({
    collection: "docs" as "pages",
    locale: "en",
    data: { title, _status: "published" } as never,
  });
  return String(doc.id);
};

const enqueue = async (id: string, targets: string[]) => {
  const res = await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: targets,
      collection_slug: "docs",
      collection_id: [id],
      strategy: "overwrite",
      publish_on_translation: false,
    },
  });
  expect(res.status, "the enqueue endpoint rejected the request").toBe(200);
};

const runQueue = () => ctx.payload.jobs.run({ queue: "translations", limit: CRON_BATCH_LIMIT });

const titleIn = async (id: string, locale: string) =>
  (
    (await ctx.payload.findByID({
      collection: "docs" as "pages",
      id,
      locale: locale as "en",
      fallbackLocale: false,
      draft: true,
    })) as Record<string, unknown>
  ).title;

const workflowJob = async (id: string) => {
  const { docs } = await ctx.payload.find({
    collection: "payload-jobs" as "pages",
    pagination: false,
    where: { workflowSlug: { equals: "translate_document_locales" } } as never,
  });
  return (
    docs as Array<{
      completedAt?: string | null;
      input?: { collection_id?: string };
      log?: Array<Record<string, unknown>>;
    }>
  ).find((j) => j.input?.collection_id === id);
};

describe("translating one document into several locales", () => {
  it("translates every requested locale, not just one", async () => {
    const source = "Multi source";
    const id = await createDoc(source);

    await enqueue(id, ["de", "fr"]);
    await runQueue();

    expect(await titleIn(id, "de"), "de was not translated").toBe(rev(source));
    expect(await titleIn(id, "fr"), "fr was not translated").toBe(rev(source));
  });

  it("runs the locales one after another, never overlapping", async () => {
    const id = await createDoc("Ordered source");

    await enqueue(id, ["de", "fr", "es"]);
    await runQueue();

    const job = await workflowJob(id);
    expect(job, "no workflow job was written").toBeDefined();
    const log = job?.log ?? [];
    expect(
      log.map((e) => (e.input as { target_lng?: string })?.target_lng),
      "the log should carry a row per locale, in request order"
    ).toEqual(["de", "fr", "es"]);
    expect(log.map((e) => e.state)).toEqual(["succeeded", "succeeded", "succeeded"]);

    // The order assertion above would also pass under `Promise.all`; only non-overlap rules it out.
    for (let i = 1; i < log.length; i++) {
      expect(
        Date.parse(log[i].executedAt as string),
        `locale ${i} started before locale ${i - 1} finished`
      ).toBeGreaterThanOrEqual(Date.parse(log[i - 1].completedAt as string));
    }
  });

  it("the status endpoint still reports a row per target locale", async () => {
    const id = await createDoc("Status source");

    await enqueue(id, ["de", "fr"]);
    await runQueue();

    const res = await callEndpoint(
      ctx.payload,
      "get",
      "/translate/document/:collection_slug/:collection_id",
      {
        routeParams: { collection_slug: "docs", collection_id: id },
      }
    );
    expect(res.status).toBe(200);
    const rows = (res.data as { data?: Array<{ input?: { target_lng?: string } }> }).data ?? [];
    expect(
      rows.map((r) => r.input?.target_lng).sort(),
      "the panel lost its per-locale detail"
    ).toEqual(["de", "fr"]);
  });

  it("does not re-run a workflow that already completed", async () => {
    const id = await createDoc("Idempotent source");

    await enqueue(id, ["de", "fr"]);
    await runQueue();

    // A *failed* job is skipped on the second run too (backoff), so prove it completed first.
    expect((await workflowJob(id))?.completedAt, "the workflow did not complete").toBeTruthy();

    const before = ctx.translateCount();
    await runQueue();

    expect(ctx.translateCount() - before, "a completed workflow was run again").toBe(0);
  });
});

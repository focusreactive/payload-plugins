import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

// Every requested locale must be translated. Booted with the REAL jobs runner — the production
// default — because the parallel fan-out this guards against exists only there: `createSyncRunner`
// translates inline and in order, which is why the rest of the suite never saw the defect.

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

// The same call the autorun cron makes, so the batching behaviour under test is the real one.
const runQueue = () => ctx.payload.jobs.run({ queue: "translations", limit: 50 });

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
    docs as Array<{ input?: { collection_id?: string }; log?: Array<Record<string, unknown>> }>
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

  it("records one log entry per locale, in the order they were requested", async () => {
    const id = await createDoc("Ordered source");

    await enqueue(id, ["de", "fr"]);
    await runQueue();

    const job = await workflowJob(id);
    expect(job, "no workflow job was written").toBeDefined();
    expect(
      job?.log?.map((e) => (e.input as { target_lng?: string })?.target_lng),
      "the log should carry a row per locale, in request order"
    ).toEqual(["de", "fr"]);
    expect(job?.log?.map((e) => e.state)).toEqual(["succeeded", "succeeded"]);
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

    const before = ctx.translateCount();
    await runQueue();

    expect(ctx.translateCount() - before, "a completed workflow was run again").toBe(0);
  });
});

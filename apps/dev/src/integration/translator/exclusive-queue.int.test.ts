import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload, CRON_BATCH_LIMIT } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

// Booted with `enableConcurrencyControl`. Its own file because the setting is fixed at boot and
// `getPayload` caches per process.

type RunResult = { jobStatus?: Record<string, unknown> };

type Job = {
  processing?: boolean;
  input?: { collection_id?: string; target_lngs?: string[] };
};

let ctx: TestPayload;
let release: (() => void) | undefined;
let reached: (() => void) | undefined;
let held: Promise<void>;

const armBarrier = () => {
  held = new Promise<void>((resolve) => {
    reached = resolve;
  });
};

beforeAll(async () => {
  armBarrier();
  ctx = await bootTestPayload({
    exclusiveQueue: true,
    runner: createPayloadJobsRunner({ autoRun: false }),
    onTranslate: async (targetLng) => {
      if (targetLng !== "de") return;
      reached?.();
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    },
  });
});
afterAll(async () => {
  release?.();
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

const enqueue = (id: string, targets: string[]) =>
  callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: targets,
      collection_slug: "docs",
      collection_id: [id],
      strategy: "overwrite",
      publish_on_translation: false,
    },
  });

const jobsFor = async (documentId: string) => {
  const { docs } = await ctx.payload.find({
    collection: "payload-jobs" as "pages",
    pagination: false,
    where: { workflowSlug: { equals: "translate_document_locales" } } as never,
  });
  return (docs as Job[]).filter((job) => job.input?.collection_id === documentId);
};

const runQueue = () =>
  ctx.payload.jobs.run({ queue: "translations", limit: CRON_BATCH_LIMIT }) as Promise<RunResult>;

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

describe("with the host's concurrency control on", () => {
  it("holds a second job for the same document, then runs it and loses nothing", async () => {
    armBarrier();
    const id = await createDoc("Exclusive source");

    await enqueue(id, ["de"]);
    const first = runQueue();
    await held;

    await enqueue(id, ["fr"]);

    // Without this the check below is satisfied by "there was nothing to pick": if the request had
    // extended the running job instead of getting one of its own, the picker would also take
    // nothing and `fr` would still translate.
    const queued = await jobsFor(id);
    expect(queued.length, "the request did not get a job of its own").toBe(2);
    expect(
      queued.find((job) => !job.processing)?.input?.target_lngs,
      "the second job should carry only the locale that was asked for"
    ).toEqual(["fr"]);

    const whileRunning = await runQueue();
    expect(
      Object.keys(whileRunning.jobStatus ?? {}),
      "the picker took a second job for a document already being written"
    ).toEqual([]);

    release?.();
    await first;
    await runQueue();

    expect(await titleIn(id, "de"), "de was lost").toBe("ecruos evisulcxE");
    expect(await titleIn(id, "fr"), "fr was lost").toBe("ecruos evisulcxE");
  });

  it("still runs jobs for different documents together", async () => {
    const first = await createDoc("Doc one");
    const second = await createDoc("Doc two");
    await enqueue(first, ["fr"]);
    await enqueue(second, ["fr"]);

    const batch = await runQueue();

    expect(
      Object.keys(batch.jobStatus ?? {}).length,
      "two documents were serialized against each other"
    ).toBe(2);
  });
});

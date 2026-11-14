import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload, CRON_BATCH_LIMIT } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

// Its own file: the setting is fixed at boot, and a boot is per process (see `bootTestPayload`).

type RunResult = { jobStatus?: Record<string, unknown> };

type Job = {
  processing?: boolean;
  input?: { collection_id?: string; targets?: { lng: string }[] };
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

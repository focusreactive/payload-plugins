import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

/*
 * Every other failure spec in this suite makes the provider throw, so the error starts inside the
 * plugin's own task handler. This one makes the work succeed and the queue's own bookkeeping fail
 * afterwards, which is what a host sees when something else has registered a jobs hook: Payload
 * then validates its own job rows, and its success log entry omits a field its schema requires.
 */
const DRAIN = 8;

type Seen = { targetLng: string };

const onCompleted = vi.fn<(task: Seen) => void>();
const onFailed = vi.fn<(task: Seen, error: unknown) => void>();

let ctx: TestPayload;

const liveRunsFor = async (id: string): Promise<number> => {
  const found = await ctx.payload.find({
    collection: "translator-runs",
    depth: 0,
    pagination: false,
    overrideAccess: true,
    where: { and: [{ collectionId: { equals: id } }, { settledAt: { exists: false } }] },
  });
  return found.docs.length;
};

const outcomesFor = async (id: string): Promise<Array<string | null | undefined>> => {
  const found = await ctx.payload.find({
    collection: "translator-runs",
    depth: 0,
    pagination: false,
    overrideAccess: true,
    where: { collectionId: { equals: id } },
  });
  return found.docs.map((row) => (row as { outcome?: string | null }).outcome);
};

const germanTitleOf = async (id: string): Promise<unknown> => {
  const doc = await ctx.payload.findByID({
    collection: "docs",
    id,
    locale: "de",
    fallbackLocale: false,
    draft: true,
    overrideAccess: true,
  });
  return (doc as { title?: unknown }).title;
};

describe("a task whose work succeeded and whose bookkeeping then failed", () => {
  let id: string;
  let translationsBought = 0;
  let settledAfterOnePass = false;

  beforeAll(async () => {
    ctx = await bootTestPayload({
      runHooks: true,
      runner: createPayloadJobsRunner({
        autoRun: false,
        retries: { attempts: 2, backoff: { type: "fixed", delay: 0 } },
      }),
      lifecycle: { onCompleted, onFailed },
    });
  });

  afterAll(async () => {
    await ctx?.cleanup();
  });

  const jobRow = async () => {
    const found = await ctx.payload.find({
      collection: "payload-jobs",
      depth: 0,
      pagination: false,
      overrideAccess: true,
    });
    const row = found.docs[0] as { completedAt?: unknown; hasError?: unknown } | undefined;
    return { completed: row?.completedAt != null, hasError: row?.hasError === true };
  };

  it("settles the run instead of leaving it in flight for ever", async () => {
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "A title", note: "A note" },
    });
    id = String(made.id);

    const before = ctx.translateCount();
    await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: ["de"],
        collection_slug: "docs",
        collection_id: [id],
        publish_on_translation: false,
      },
    });
    await ctx.payload.jobs.run({ queue: "translations" });
    settledAfterOnePass = (await liveRunsFor(id)) === 0;

    for (let pass = 1; pass < DRAIN; pass++) {
      await ctx.payload.jobs.run({ queue: "translations" });
    }
    translationsBought = ctx.translateCount() - before;

    expect(
      await liveRunsFor(id),
      "a run nobody closes keeps the document busy and the panel saying it is translating"
    ).toBe(0);
  });

  /*
   * The translation itself ran to the end and its text is in the document. What broke is the
   * queue's own record of having finished, which arrives after the work. Calling that a failed
   * translation sends the editor back to re-run something that is already done.
   */
  it("records the locale as delivered, because the text was written", async () => {
    expect({
      outcomes: await outcomesFor(id),
      germanTitle: await germanTitleOf(id),
    }).toStrictEqual({ outcomes: ["delivered"], germanTitle: "de:A title" });
  });

  it("tells the host the locale completed, not that it failed", async () => {
    expect({
      completed: onCompleted.mock.calls.map(([task]) => task.targetLng),
      failed: onFailed.mock.calls.map(([task]) => task.targetLng),
    }).toStrictEqual({ completed: ["de"], failed: [] });
  });

  /*
   * The queue remembers a finished step in its own log, and writing that log is what fails here —
   * so nothing is remembered, and every retry runs the step again. Each one calls the provider and
   * writes the same text back, over a translation that landed on the first attempt.
   */
  it("settles on the first pass, rather than waiting for the retries to run out", () => {
    expect(settledAfterOnePass).toBe(true);
  });

  it("leaves the queue nothing to run again", async () => {
    expect(await jobRow()).toStrictEqual({ completed: true, hasError: false });
  });

  it("pays the provider once, because the translation succeeded the first time", () => {
    expect(translationsBought).toBe(1);
  });
});

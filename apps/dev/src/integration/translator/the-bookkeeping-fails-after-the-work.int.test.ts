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

  it("settles the run instead of leaving it in flight for ever", async () => {
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "A title", note: "A note" },
    });
    id = String(made.id);

    await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: ["de"],
        collection_slug: "docs",
        collection_id: [id],
        publish_on_translation: false,
      },
    });
    for (let pass = 0; pass < DRAIN; pass++) {
      await ctx.payload.jobs.run({ queue: "translations" });
    }

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
});

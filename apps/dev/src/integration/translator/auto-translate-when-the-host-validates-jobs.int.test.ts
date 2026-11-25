import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";

/*
 * The owner's installation runs auto-translate behind a real queue, with another plugin making
 * Payload validate its own job rows. No spec had put those three together: the auto-translate
 * specs use the inline runner, and the one spec that validates job rows enqueues by hand.
 */
const DRAIN = 8;

type Seen = { targetLng: string };

const onCompleted = vi.fn<(task: Seen) => void>();
const onFailed = vi.fn<(task: Seen, error: unknown) => void>();

let ctx: TestPayload;

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

describe("auto-translate while the host validates its own job rows", () => {
  let id: string;

  beforeAll(async () => {
    ctx = await bootTestPayload({
      autoTranslate: { targets: ["de"] },
      runHooks: true,
      runner: createPayloadJobsRunner({
        autoRun: false,
        retries: { attempts: 2, backoff: { type: "fixed", delay: 0 } },
      }),
      lifecycle: { onCompleted, onFailed },
    });
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "A title" },
    });
    id = String(made.id);

    for (let pass = 0; pass < DRAIN; pass++) {
      await ctx.payload.jobs.run({ queue: "translations" });
    }
  });

  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("writes the translation and records the locale as delivered", async () => {
    expect({
      outcomes: await outcomesFor(id),
      germanTitle: await germanTitleOf(id),
    }).toStrictEqual({ outcomes: ["delivered"], germanTitle: "de:A title" });
  });

  it("tells the host the locale completed, not that it failed", () => {
    expect({
      completed: onCompleted.mock.calls.map(([task]) => task.targetLng),
      failed: onFailed.mock.calls.map(([task]) => task.targetLng),
    }).toStrictEqual({ completed: ["de"], failed: [] });
  });
});

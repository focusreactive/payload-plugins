import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

/*
 * The queue cannot record a finished step here, and a step it cannot record it runs again. One
 * locale per run is not enough to see what that costs: the question is whether the locales behind
 * the first one are reached at all, and whether each of them is paid for once.
 */
const DRAIN = 8;

let ctx: TestPayload;

const outcomesByLocale = async (id: string): Promise<Record<string, string | null>> => {
  const found = await ctx.payload.find({
    collection: "translator-runs",
    depth: 0,
    pagination: false,
    overrideAccess: true,
    where: { collectionId: { equals: id } },
  });
  return Object.fromEntries(
    found.docs.map((row) => {
      const run = row as { targetLng?: string; outcome?: string | null };
      if (run.targetLng === undefined) throw new Error("a run record that names no locale");
      return [run.targetLng, run.outcome ?? null];
    })
  );
};

const create = async (title: string): Promise<string> => {
  const made = await ctx.payload.create({
    collection: "docs",
    locale: "en",
    data: { _status: "published", title },
  });
  return String(made.id);
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

const drain = async (passes: number) => {
  for (let pass = 0; pass < passes; pass++) {
    await ctx.payload.jobs.run({ queue: "translations" });
  }
};

/*
 * A host that makes the queue validate its own rows breaks its failure record as well as its
 * success record, and that second refusal is thrown out of `jobs.run` itself. The plugin's own
 * records are written before it escapes, which is what this spec reads.
 */
const drainPastTheQueuesOwnThrow = async (passes: number) => {
  for (let pass = 0; pass < passes; pass++) {
    await ctx.payload.jobs.run({ queue: "translations" }).catch(() => undefined);
  }
};

beforeAll(async () => {
  ctx = await bootTestPayload({
    runHooks: true,
    failFor: ["fr"],
    runner: createPayloadJobsRunner({
      autoRun: false,
      retries: { attempts: 2, backoff: { type: "fixed", delay: 0 } },
    }),
  });
});

afterAll(async () => {
  await ctx?.cleanup();
});

describe("several locales when the queue cannot record a finished step", () => {
  it("reaches every locale and pays for each of them once", async () => {
    const id = await create("Two locales");
    const before = ctx.translateCount();

    await enqueue(id, ["de", "es"]);
    await drain(1);

    expect({
      outcomes: await outcomesByLocale(id),
      bought: ctx.translateCount() - before,
    }).toStrictEqual({ outcomes: { de: "delivered", es: "delivered" }, bought: 2 });
  });

  /*
   * The two failures travel together here: the first locale's text is written and only its record
   * fails, the second's translation never happens at all. The first is delivered; the second is
   * not, and under this host it gets no ending at all — the queue cannot record a task failure
   * either, so its own row wedges and never gives the plugin a last attempt to report on. The
   * panel reads that open record as having no news, with its cancel beside it.
   */
  it("delivers the locale whose text landed, and does not deliver the one that failed", async () => {
    const id = await create("One lands, one fails");

    await enqueue(id, ["de", "fr"]);
    await drainPastTheQueuesOwnThrow(DRAIN);

    expect(await outcomesByLocale(id)).toStrictEqual({ de: "delivered", fr: null });
  });
});

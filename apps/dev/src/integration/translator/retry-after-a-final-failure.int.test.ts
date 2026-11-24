import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

/*
 * A run that has already ended can be told to run again, and then it ends a second time — this
 * time well. The second ending is the true one, so nothing may treat the first as final.
 */
const DRAIN = 4;

type Seen = { targetLng: string };

const onCompleted = vi.fn<(task: Seen) => void>();
const onFailed = vi.fn<(task: Seen, error: unknown) => void>();

let ctx: TestPayload;
let providerIsDown = true;

const outcomeFor = async (id: string): Promise<string | null | undefined> => {
  const found = await ctx.payload.find({
    collection: "translator-runs",
    depth: 0,
    pagination: false,
    overrideAccess: true,
    where: { collectionId: { equals: id } },
  });
  return (found.docs[0] as { outcome?: string | null } | undefined)?.outcome;
};

describe("a run told to go again after it had already failed for good", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      runner: createPayloadJobsRunner({ autoRun: false, retries: { attempts: 0 } }),
      lifecycle: { onCompleted, onFailed },
      onTranslate: () => {
        if (providerIsDown) throw new Error("provider down");
      },
    });
  });

  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("records what the retry did, not what the first attempt did", async () => {
    /*
     * The run endpoint refuses a run nobody is recorded as having asked for, because starting one
     * writes with the host's rules off.
     */
    const editor = {
      ...(await ctx.payload.create({
        collection: "users",
        data: { email: "second-go@test.dev", password: "pw123456" } as never,
      })),
      collection: "users",
    };

    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Worth a second go", note: "A note" },
    });
    const id = String(made.id);

    await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      user: editor as never,
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
      onFailed.mock.calls.map(([task]) => task.targetLng),
      "the run ended badly"
    ).toEqual(["de"]);
    expect(await outcomeFor(id)).toBe("failed");

    providerIsDown = false;
    const retry = await callEndpoint(
      ctx.payload,
      "post",
      "/translate/run/:collection_slug/:collection_id",
      { user: editor as never, routeParams: { collection_slug: "docs", collection_id: id } }
    );
    expect(retry.status).toBe(204);
    for (let pass = 0; pass < DRAIN; pass++) {
      await ctx.payload.jobs.run({ queue: "translations" });
    }

    expect(
      {
        outcome: await outcomeFor(id),
        completed: onCompleted.mock.calls.map(([t]) => t.targetLng),
      },
      "a retry that worked must replace the failure it was started from"
    ).toStrictEqual({ outcome: "delivered", completed: ["de"] });
  });
});

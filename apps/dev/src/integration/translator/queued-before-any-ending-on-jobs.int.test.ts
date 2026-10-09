import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

type Heard = { event: string; targetLng: string };

const heard: Heard[] = [];
const hear =
  (event: string) =>
  (task: { targetLng: string }): void => {
    heard.push({ event, targetLng: task.targetLng });
  };

/** Enough passes that the run is finished one way or another before anything is read. */
const DRAIN = 8;

let ctx: TestPayload;
let heardAtEnqueue: Heard[] = [];

describe("a host hears onQueued before any ending, with the runner that queues onto Payload", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      runner: createPayloadJobsRunner({
        autoRun: false,
        retries: { attempts: 1, backoff: { type: "fixed", delay: 0 } },
      }),
      lifecycle: {
        onQueued: hear("queued"),
        onCompleted: hear("completed"),
        onFailed: hear("failed"),
      },
      onTranslate: (targetLng) => {
        if (targetLng === "fr") throw new Error("provider down");
      },
    });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("fires once per requested locale, each before that locale's ending", async () => {
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Heard in order", note: "A note" },
    });
    await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: ["de", "fr"],
        collection_slug: "docs",
        collection_id: [String(made.id)],
        strategy: "overwrite",
        publish_on_translation: false,
      },
    });
    heardAtEnqueue = [...heard];
    for (let pass = 0; pass < DRAIN; pass++) {
      await ctx.payload.jobs.run({ queue: "translations" });
    }

    for (const targetLng of ["de", "fr"]) {
      const forLocale = heard.filter((entry) => entry.targetLng === targetLng);
      expect(
        forLocale.filter((entry) => entry.event === "queued"),
        `${targetLng} is announced queued exactly once`
      ).toHaveLength(1);
      expect(
        forLocale[0]?.event,
        `${targetLng} ended before the host was told it had started`
      ).toBe("queued");
    }
  });

  it("has told the host about every locale before the enqueue answers", () => {
    expect(
      heardAtEnqueue.map((entry) => `${entry.event}:${entry.targetLng}`),
      "a host that only learns of the work once it is over cannot show it as pending"
    ).toEqual(["queued:de", "queued:fr"]);
  });
});

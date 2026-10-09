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

let ctx: TestPayload;

/** The harness boots the synchronous runner, which translates inside `enqueue`. */
describe("a host hears onQueued before any ending, with the runner that translates inline", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
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
    expect(heard.map((entry) => `${entry.event}:${entry.targetLng}`)).toEqual([
      "queued:de",
      "completed:de",
      "queued:fr",
      "failed:fr",
    ]);
  });
});

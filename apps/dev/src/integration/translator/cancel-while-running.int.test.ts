import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

type Assignment = { target_lng: string; handle: string };

// SQLite only. Cancelling from inside the running job deletes a row that job's own transaction
// holds, which on a real transactional adapter blocks until the suite's teardown times out. What is
// under test is which callbacks the plugin fires, and that is the same on every adapter.
const SQLITE = (process.env.DB_ADAPTER ?? "sqlite") === "sqlite";

let ctx: TestPayload;
let handle: string | undefined;
const announced: string[] = [];

const say = (what: string) => (task: { targetLng: string }) => {
  announced.push(`${what}:${task.targetLng}`);
};

describe.skipIf(!SQLITE)("cancelling a run that is already translating", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({
      runner: createPayloadJobsRunner({ autoRun: false, retries: { attempts: 0 } }),
      lifecycle: {
        onCompleted: say("completed"),
        onFailed: say("failed"),
        onCancelled: say("cancelled"),
      },
      onTranslate: async (targetLng) => {
        if (targetLng === "de" && handle) {
          await callEndpoint(ctx.payload, "delete", "/translate/cancel", {
            body: { ids: [handle] },
          });
        }
      },
    });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("does not also report the locales as failed", async () => {
    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Stopped mid-flight", note: "A note" },
    });
    const res = await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: ["de", "fr"],
        collection_slug: "docs",
        collection_id: [String(made.id)],
        strategy: "overwrite",
        publish_on_translation: false,
      },
    });
    handle = ((res.data as { data: { assignments?: Assignment[] } }).data.assignments ?? [])[0]
      ?.handle;

    // Payload's own update throws when the row it is writing was deleted under it.
    await ctx.payload.jobs.run({ queue: "translations" }).catch(() => undefined);

    expect(announced, "the run was cancelled, so the host is told that").toContain("cancelled:de");
    expect(
      announced.filter((a) => a.startsWith("failed:")),
      `nothing translated failed — a machinery error is not a locale giving up (saw: ${announced.join(", ")})`
    ).toEqual([]);
  });
});

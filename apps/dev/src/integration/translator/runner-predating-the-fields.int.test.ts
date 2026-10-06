import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

type Seen = { targetLng: string; jobId?: string; attempt?: number };

const onQueued = vi.fn<(task: Seen) => void>();
const onCompleted = vi.fn<(task: Seen) => void>();

let ctx: TestPayload;
let docId: string;

describe("a runner written before the new handler fields existed", () => {
  beforeAll(async () => {
    ctx = await bootTestPayload({ lifecycle: { onQueued, onCompleted } });

    const made = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "No ids here", note: "A note" },
    });
    docId = String(made.id);

    await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: "de",
        collection_slug: "docs",
        collection_id: [docId],
        strategy: "overwrite",
        publish_on_translation: true,
      },
    });
  });

  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("still runs the translation to completion", async () => {
    expect(onCompleted).toHaveBeenCalled();

    const de = (await ctx.payload.findByID({
      collection: "docs",
      id: docId,
      locale: "de",
    })) as Record<string, unknown>;

    expect(de.title, "the work happened, ids or no ids").toBe("de:No ids here");
  });

  it("reports the absent attempt as absent rather than empty — it has no retries to count", () => {
    expect(onCompleted.mock.calls[0]?.[0].attempt).toBeUndefined();
  });

  it("names the id it does have, so the callback matches the enqueue response", () => {
    expect(
      onCompleted.mock.calls[0]?.[0].jobId,
      "this runner mints an id and reports it; carrying it in the response but not the callback would be a split personality"
    ).toBeTruthy();
  });

  it("still fires the queued callback", () => {
    expect(onQueued).toHaveBeenCalled();
  });
});

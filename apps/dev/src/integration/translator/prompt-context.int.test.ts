import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

/**
 * A `systemPrompt` builder can only scope itself to a collection if the plugin says which one the
 * run is translating. Asserted out at the provider rather than at the unit that assembles it, so a
 * hop lost anywhere along the pipeline shows up here.
 */
type Seen = { collection: string; id: string } | undefined;

describe("what the provider is told about a document run", () => {
  let ctx: TestPayload;
  const seen: Seen[] = [];

  beforeAll(async () => {
    ctx = await bootTestPayload({
      onRequest: (options) => {
        seen.push(options?.document);
      },
    });
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("names the collection and the document being translated", async () => {
    const created = await ctx.payload.create({
      collection: "docs",
      data: { title: "Prompt context" },
    } as never);
    const id = String((created as { id: unknown }).id);
    seen.length = 0;

    await callEndpoint(ctx.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: "de",
        collection_slug: "docs",
        collection_id: [id],

        publish_on_translation: true,
      },
    });

    expect(seen.length, "nothing was translated, so nothing could be told").toBeGreaterThan(0);
    expect(seen[0]).toEqual({ collection: "docs", id });
  });
});

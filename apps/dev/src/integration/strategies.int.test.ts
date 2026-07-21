import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

// R4 — translation strategies, with DISTINCT assertions per branch:
//   overwrite     → replaces an existing target value with the new translation.
//   skip_existing → keeps an already-filled target value, but still fills an EMPTY sibling.

const rev = (s: string) => [...s].reverse().join("");

const enqueue = (ctx: TestPayload, id: string, strategy: "overwrite" | "skip_existing") =>
  callEndpoint(ctx.payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: "de",
      collection_slug: "docs",
      collection_id: [id],
      strategy,
      publish_on_translation: true,
    },
  });

describe("translation strategies", () => {
  let ctx: TestPayload;

  beforeAll(async () => {
    ctx = await bootTestPayload();
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("overwrite replaces an existing target value", async () => {
    const created = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "En title" },
    });
    const id = String(created.id);
    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "de",
      data: { _status: "published", title: "Manual DE" },
    });

    await enqueue(ctx, id, "overwrite");

    const de = await ctx.payload.findByID({ collection: "docs", id, locale: "de" });
    expect(de.title).toBe(rev("En title")); // replaced
    expect(de.title).not.toBe("Manual DE");
  });

  it("skip_existing keeps a filled target but fills an empty sibling", async () => {
    const created = await ctx.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "En title", meta: { subtitle: "En sub" } },
    });
    const id = String(created.id);
    // de.title already filled; de.meta.subtitle deliberately left empty.
    await ctx.payload.update({
      collection: "docs",
      id,
      locale: "de",
      data: { _status: "published", title: "Keep DE" },
    });

    await enqueue(ctx, id, "skip_existing");

    const de = await ctx.payload.findByID({ collection: "docs", id, locale: "de" });
    expect(de.title).toBe("Keep DE"); // existing kept
    expect((de.meta as { subtitle?: string }).subtitle).toBe(rev("En sub")); // empty filled
  });
});

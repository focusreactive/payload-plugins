import { describe, it, expect } from "vitest";

import { EnqueueInputSchema } from "./model";

const base = {
  source_lng: "en",
  collection_slug: "posts",
  collection_id: ["doc-1"],
};

describe("EnqueueInputSchema.target_lng", () => {
  it("accepts a single string target (back-compat, AC2)", () => {
    const r = EnqueueInputSchema.safeParse({ ...base, target_lng: "de" });
    expect(r.success).toBe(true);
  });

  it("accepts an array of targets (AC2)", () => {
    const r = EnqueueInputSchema.safeParse({ ...base, target_lng: ["de", "fr"] });
    expect(r.success).toBe(true);
  });

  it("rejects an empty array (empty multi-select, AC7 server side)", () => {
    const r = EnqueueInputSchema.safeParse({ ...base, target_lng: [] });
    expect(r.success).toBe(false);
  });

  it("rejects an empty string target", () => {
    const r = EnqueueInputSchema.safeParse({ ...base, target_lng: "" });
    expect(r.success).toBe(false);
  });

  it("rejects a missing target_lng", () => {
    const r = EnqueueInputSchema.safeParse({ ...base });
    expect(r.success).toBe(false);
  });
});

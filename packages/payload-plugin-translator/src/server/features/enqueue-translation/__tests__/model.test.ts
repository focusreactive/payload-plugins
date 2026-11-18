import { describe, it, expect } from "vitest";

import { EnqueueInputSchema } from "../model.js";

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

describe("EnqueueInputSchema — members that narrowed a run and no longer exist", () => {
  const asked = (body: Record<string, unknown>) =>
    EnqueueInputSchema.safeParse({ ...base, target_lng: "de", ...body });

  it.each([
    ["strategy", { strategy: "skip_existing" }],
    ["selection", { selection: ["title"] }],
    ["criteria", { criteria: ["stale"] }],
  ])("refuses `%s` rather than translating the whole document", (_name, body) => {
    const result = asked(body);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("filters");
  });

  it("accepts the shape that replaced them", () => {
    expect(asked({ filters: [{ kind: "leaves", addresses: ["title"] }] }).success).toBe(true);
  });

  it("refuses a document id that names nothing", () => {
    // Payload skips the document load for an empty id, so the update rule would be asked about
    // nothing and a role-based rule would grant it.
    const parsed = EnqueueInputSchema.safeParse({
      source_lng: "en",
      target_lng: ["de"],
      collection_slug: "posts",
      collection_id: [""],
    });

    expect(parsed.success).toBe(false);
  });
});

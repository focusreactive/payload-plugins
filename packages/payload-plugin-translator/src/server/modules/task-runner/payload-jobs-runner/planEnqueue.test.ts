import { describe, expect, it } from "vitest";

import { planEnqueue } from "./planEnqueue";
import type { RequestShape } from "./planEnqueue";
import type { PayloadJob } from "./types";

const request: RequestShape = {
  collectionSlug: "posts",
  collectionId: "doc-1",
  sourceLng: "en",
  strategy: "overwrite",
  publishOnTranslation: false,
};

const storedInput = {
  collection_slug: "posts",
  collection_id: "doc-1",
  source_lng: "en",
  strategy: "overwrite",
  publish_on_translation: false,
  target_lngs: ["de"],
};

const job = (overrides: Partial<PayloadJob> = {}): PayloadJob => ({
  id: "job-1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  input: storedInput,
  ...overrides,
});

const plan = (live: PayloadJob[], requested: string[], exclusiveQueue = false) =>
  planEnqueue({ live, request, requested, exclusiveQueue });

describe("planEnqueue", () => {
  it("queues everything when the document has no live job", () => {
    expect(plan([], ["de", "fr"])).toEqual({ host: null, append: [], queue: ["de", "fr"] });
  });

  it("adds locales the live job does not carry yet", () => {
    const live = job();
    expect(plan([live], ["fr", "es"])).toEqual({ host: live, append: ["fr", "es"], queue: [] });
  });

  it("does nothing for a locale the live job already owes", () => {
    const live = job();
    expect(plan([live], ["de"])).toEqual({ host: live, append: [], queue: [] });
  });

  it("gives a locale the live job has already translated a job of its own", () => {
    const live = job({
      log: [{ state: "succeeded", input: { target_lng: "de" } }],
    });
    expect(plan([live], ["de"])).toEqual({ host: live, append: [], queue: ["de"] });
  });

  it("splits a request across both when it mixes the two", () => {
    const live = job({ log: [{ state: "succeeded", input: { target_lng: "de" } }] });
    expect(plan([live], ["de", "fr"])).toEqual({ host: live, append: ["fr"], queue: ["de"] });
  });

  it("ignores duplicates in the request", () => {
    const live = job();
    expect(plan([live], ["fr", "fr"])).toEqual({ host: live, append: ["fr"], queue: [] });
  });

  it.each([
    ["oldest first", ["old", "new"]],
    ["newest first", ["new", "old"]],
  ])("extends the newest live job, %s", (_label, order) => {
    const byId = {
      old: job({ id: "old", createdAt: "2026-01-01T00:00:00Z" }),
      new: job({ id: "new", createdAt: "2026-01-02T00:00:00Z" }),
    };
    expect(
      plan(
        order.map((id) => byId[id as "old" | "new"]),
        ["fr"]
      ).host?.id
    ).toBe("new");
  });

  it("picks the newest job that is usable, not the newest job", () => {
    const newerButCancelled = job({
      id: "cancelled",
      createdAt: "2026-01-03T00:00:00Z",
      error: { cancelled: true },
    });
    const usable = job({ id: "usable", createdAt: "2026-01-02T00:00:00Z" });
    expect(plan([newerButCancelled, usable], ["fr"]).host?.id).toBe("usable");
  });

  it("does not extend a job in the pre-workflow shape", () => {
    const legacy = job({
      input: { ...storedInput, target_lngs: undefined, target_lng: "de" },
    });
    expect(plan([legacy], ["fr"])).toEqual({ host: null, append: [], queue: ["fr"] });
  });

  it("does not extend a cancelled job", () => {
    const cancelled = job({ error: { cancelled: true } });
    expect(plan([cancelled], ["fr"])).toEqual({ host: null, append: [], queue: ["fr"] });
  });

  describe("when the host enabled Payload's concurrency control", () => {
    it("queues alongside a running job instead of extending it", () => {
      const running = job({ processing: true });
      expect(plan([running], ["fr"], true)).toEqual({ host: null, append: [], queue: ["fr"] });
    });

    it("merges an already-translated locale into the alongside job too", () => {
      const running = job({
        processing: true,
        log: [{ state: "succeeded", input: { target_lng: "de" } }],
      });
      expect(plan([running], ["de", "fr"], true)).toEqual({
        host: null,
        append: [],
        queue: ["fr", "de"],
      });
    });

    it("still extends a job that has not started", () => {
      const pending = job({ processing: false });
      expect(plan([pending], ["fr"], true)).toEqual({ host: pending, append: ["fr"], queue: [] });
    });
  });

  it("extends a running job when the host has NOT enabled concurrency control", () => {
    const running = job({ processing: true });
    expect(plan([running], ["fr"])).toEqual({ host: running, append: ["fr"], queue: [] });
  });

  describe("a job can only take locales from a request it matches", () => {
    it.each([
      ["a different strategy", { strategy: "skip_existing" }],
      ["a different source locale", { source_lng: "fr" }],
      ["a different publish flag", { publish_on_translation: true }],
    ])("starts its own job for %s", (_label, storedOverride) => {
      const live = job({ input: { ...storedInput, ...storedOverride } });
      expect(plan([live], ["fr"])).toEqual({ host: null, append: [], queue: ["fr"] });
    });
  });
});

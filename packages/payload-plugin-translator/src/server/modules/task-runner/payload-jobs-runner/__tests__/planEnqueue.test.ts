import { describe, expect, it } from "vitest";

import { planEnqueue } from "../model/planEnqueue.js";
import type { EnqueuePlan } from "../model/planEnqueue.js";
import type { RequestShape } from "../model/planEnqueue.js";
import type { PayloadJob } from "../store/types.js";

const request: RequestShape = {
  collectionSlug: "posts",
  collectionId: "doc-1",
  sourceLng: "en",
  strategy: "overwrite",
  publishOnTranslation: false,
  requesterId: null,
  requesterCollection: null,
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

const planOf = (over: Partial<EnqueuePlan> = {}): EnqueuePlan => ({
  host: null,
  append: [],
  queue: [],
  covered: [],
  coveredBy: null,
  ...over,
});

describe("planEnqueue", () => {
  it("queues everything when the document has no live job", () => {
    expect(plan([], ["de", "fr"])).toEqual(planOf({ queue: ["de", "fr"] }));
  });

  it("gives a locale the job translated and then failed on a run of its own", () => {
    const live = job({
      log: [
        { state: "succeeded", input: { target_lng: "de" } },
        { state: "failed", input: { target_lng: "de" } },
      ],
    });
    expect(
      plan([live], ["de"]),
      "it was translated once, so Payload will not run that id again — it belongs in no other list"
    ).toEqual(planOf({ host: live, queue: ["de"] }));
  });

  it("will not host on a job whose retries are spent", () => {
    const spent = job({ hasError: true });
    expect(
      plan([spent], ["de", "fr"]),
      "Payload never picks that job up again, so appending to it would promise nothing"
    ).toEqual(planOf({ queue: ["de", "fr"] }));
  });

  it("adds locales the live job does not carry yet", () => {
    const live = job();
    expect(plan([live], ["fr", "es"])).toEqual(planOf({ host: live, append: ["fr", "es"] }));
  });

  it("reports a locale the live job already owes as covered by it", () => {
    const live = job();
    expect(
      plan([live], ["de"]),
      "nothing is written for it, yet that job will translate it — so the caller is owed its handle"
    ).toEqual(planOf({ host: live, covered: ["de"], coveredBy: live }));
  });

  it("gives a locale the live job has already translated a job of its own", () => {
    const live = job({
      log: [{ state: "succeeded", input: { target_lng: "de" } }],
    });
    expect(plan([live], ["de"])).toEqual(planOf({ host: live, queue: ["de"] }));
  });

  it("splits a request across both when it mixes the two", () => {
    const live = job({ log: [{ state: "succeeded", input: { target_lng: "de" } }] });
    expect(plan([live], ["de", "fr"])).toEqual(
      planOf({ host: live, append: ["fr"], queue: ["de"] })
    );
  });

  it("ignores duplicates in the request", () => {
    const live = job();
    expect(plan([live], ["fr", "fr"])).toEqual(planOf({ host: live, append: ["fr"] }));
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
    expect(plan([legacy], ["fr"])).toEqual(planOf({ queue: ["fr"] }));
  });

  it("does not extend a cancelled job", () => {
    const cancelled = job({ error: { cancelled: true } });
    expect(plan([cancelled], ["fr"])).toEqual(planOf({ queue: ["fr"] }));
  });

  describe("when the host enabled Payload's concurrency control", () => {
    it("queues alongside a running job instead of extending it", () => {
      const running = job({ processing: true });
      expect(plan([running], ["fr"], true)).toEqual(planOf({ queue: ["fr"], coveredBy: running }));
    });

    it("merges an already-translated locale into the alongside job too", () => {
      const running = job({
        processing: true,
        log: [{ state: "succeeded", input: { target_lng: "de" } }],
      });
      expect(plan([running], ["de", "fr"], true)).toEqual(
        planOf({ queue: ["fr", "de"], coveredBy: running })
      );
    });

    it("still extends a job that has not started", () => {
      const pending = job({ processing: false });
      expect(plan([pending], ["fr"], true)).toEqual(planOf({ host: pending, append: ["fr"] }));
    });
  });

  it("extends a running job when the host has NOT enabled concurrency control", () => {
    const running = job({ processing: true });
    expect(plan([running], ["fr"])).toEqual(planOf({ host: running, append: ["fr"] }));
  });

  describe("every requested locale is accounted for", () => {
    const partlyTranslated = () =>
      job({
        input: { ...storedInput, target_lngs: ["de", "fr"] },
        log: [{ state: "succeeded", input: { target_lng: "de" } }],
      });

    it.each<[string, () => PayloadJob[], string[], boolean]>([
      ["no live job", () => [], ["de", "fr"], false],
      ["a live job carrying one of them", () => [job()], ["de", "fr"], false],
      [
        "a live job that translated one of them",
        () => [partlyTranslated()],
        ["de", "fr", "es"],
        false,
      ],
      ["a live job carrying all of them", () => [partlyTranslated()], ["fr"], false],
      [
        "a running job under an exclusive queue",
        () => [job({ processing: true })],
        ["de", "fr"],
        true,
      ],
      ["a cancelled job", () => [job({ error: { cancelled: true } })], ["de"], false],
    ])(
      "splits the request into exactly three lists, with %s",
      (_label, live, requested, exclusive) => {
        const result = plan(live(), requested, exclusive);
        const landed = [...result.append, ...result.queue, ...result.covered];

        expect(
          [...landed].sort(),
          "a locale in none of them is work nobody can report, and one in two of them is reported twice"
        ).toEqual([...new Set(requested)].sort());
        expect(landed, "no locale lands in two lists").toHaveLength(new Set(landed).size);
      }
    );

    it("names the run covering a locale even when that run may not be appended to", () => {
      const running = job({ processing: true });

      const result = plan([running], ["de"], true);

      expect(result.host, "an exclusive queue forbids writing to it").toBeNull();
      expect(result.coveredBy, "but it is still translating de").toBe(running);
    });
  });

  describe("a job can only take locales from a request it matches", () => {
    it.each([
      ["a different strategy", { strategy: "skip_existing" }],
      ["a different source locale", { source_lng: "fr" }],
      ["a different publish flag", { publish_on_translation: true }],
    ])("starts its own job for %s", (_label, storedOverride) => {
      const live = job({ input: { ...storedInput, ...storedOverride } });
      expect(plan([live], ["fr"])).toEqual(planOf({ queue: ["fr"] }));
    });
  });
});

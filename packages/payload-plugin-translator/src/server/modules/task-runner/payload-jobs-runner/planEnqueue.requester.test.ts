import { describe, expect, it } from "vitest";

import { planEnqueue } from "./planEnqueue.js";
import type { RequestShape } from "./planEnqueue.js";
import type { PayloadJob } from "./types.js";

const anna: RequestShape = {
  collectionSlug: "posts",
  collectionId: "doc-1",
  sourceLng: "en",
  strategy: "overwrite",
  publishOnTranslation: false,
  requesterId: "anna",
  requesterCollection: "users",
};

const jobQueuedBy = (
  requesterId: string | null,
  requesterCollection: string | null = requesterId === null ? null : "users"
): PayloadJob => ({
  id: "job-1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  input: {
    collection_slug: "posts",
    collection_id: "doc-1",
    source_lng: "en",
    strategy: "overwrite",
    publish_on_translation: false,
    target_lngs: ["de"],
    requester_id: requesterId,
    requester_collection: requesterCollection,
  },
});

// A job carries one requester for all of its locales, so extending someone else's job would run this
// request under rights its author does not have. Same argument the source-locale and strategy checks
// already make, with a sharper edge.
describe("planEnqueue — whose job may host a request", () => {
  it("does not extend a job queued by someone else", () => {
    const plan = planEnqueue({
      live: [jobQueuedBy("boris")],
      request: anna,
      requested: ["fr"],
      exclusiveQueue: false,
    });

    expect(plan.host).toBeNull();
    expect(plan.queue).toEqual(["fr"]);
  });

  it("extends a job the same requester queued", () => {
    const plan = planEnqueue({
      live: [jobQueuedBy("anna")],
      request: anna,
      requested: ["fr"],
      exclusiveQueue: false,
    });

    expect(plan.host).not.toBeNull();
    expect(plan.append).toEqual(["fr"]);
  });

  // A job queued before this field existed records nobody. It must not become everybody's host.
  it("does not extend a job that recorded no requester", () => {
    const plan = planEnqueue({
      live: [jobQueuedBy(null)],
      request: anna,
      requested: ["fr"],
      exclusiveQueue: false,
    });

    expect(plan.host).toBeNull();
    expect(plan.queue).toEqual(["fr"]);
  });

  it("lets an unattributed request extend an unattributed job", () => {
    const plan = planEnqueue({
      live: [jobQueuedBy(null)],
      request: { ...anna, requesterId: null, requesterCollection: null },
      requested: ["fr"],
      exclusiveQueue: false,
    });

    expect(plan.host).not.toBeNull();
    expect(plan.append).toEqual(["fr"]);
  });

  // Two auth-enabled collections is the configuration the two-key identity exists for: `admins:1` and
  // `editors:1` are different people carrying the same id.
  it("does not extend a job queued by the same id in a different collection", () => {
    const plan = planEnqueue({
      live: [jobQueuedBy("anna", "admins")],
      request: anna,
      requested: ["fr"],
      exclusiveQueue: false,
    });

    expect(plan.host).toBeNull();
    expect(plan.queue).toEqual(["fr"]);
  });
});

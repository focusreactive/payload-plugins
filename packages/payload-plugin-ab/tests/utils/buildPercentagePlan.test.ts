import { describe, expect, it } from "vitest";
import { buildPercentagePlan } from "../../src/utils/buildPercentagePlan";

const draft = (id: string, pct: number, status: "draft" | "published" = "published") => ({
  id,
  _abPassPercentage: pct,
  _status: status,
});

describe("buildPercentagePlan", () => {
  it("drops pending ids that no longer exist", () => {
    const plan = buildPercentagePlan({
      pending: { v1: 30, ghost: 40 },
      draftDocs: [draft("v1", 10)],
      publishedDocs: [draft("v1", 10)],
    });
    expect(plan.entries.map((e) => e.variantId)).toEqual(["v1"]);
    expect(plan.total).toBe(30);
  });

  it("applies an override on top of the draft value", () => {
    const plan = buildPercentagePlan({
      pending: { v1: 30 },
      draftDocs: [draft("v1", 10)],
      publishedDocs: [draft("v1", 10)],
    });
    expect(plan.entries[0]).toEqual({
      variantId: "v1",
      desired: 30,
      draftPercentage: 10,
      publishedPercentage: 10,
      isDirty: false,
    });
  });

  it("skips variants where nothing needs to change", () => {
    const plan = buildPercentagePlan({
      pending: { v1: 10 },
      draftDocs: [draft("v1", 10)],
      publishedDocs: [draft("v1", 10)],
    });
    expect(plan.entries).toEqual([]);
    expect(plan.total).toBe(10);
  });

  it("includes a variant whose draft percentage was saved earlier but never published", () => {
    const plan = buildPercentagePlan({
      pending: {},
      draftDocs: [draft("v1", 30, "draft")],
      publishedDocs: [draft("v1", 10)],
    });
    expect(plan.entries[0]).toMatchObject({
      variantId: "v1",
      desired: 30,
      draftPercentage: 30,
      publishedPercentage: 10,
      isDirty: true,
    });
  });

  it("reports publishedPercentage as null for a never-published variant", () => {
    const plan = buildPercentagePlan({
      pending: { v1: 30 },
      draftDocs: [draft("v1", 10, "draft")],
      publishedDocs: [draft("v1", 10, "draft")],
    });
    expect(plan.entries[0]?.publishedPercentage).toBeNull();
  });

  it("totals every variant, not only the changed ones", () => {
    const plan = buildPercentagePlan({
      pending: { v1: 30 },
      draftDocs: [draft("v1", 10), draft("v2", 25), draft("v3", 5)],
      publishedDocs: [draft("v1", 10), draft("v2", 25), draft("v3", 5)],
    });
    expect(plan.total).toBe(60);
  });

  it("matches numeric ids against string pending keys", () => {
    const plan = buildPercentagePlan({
      pending: { "7": 30 },
      draftDocs: [{ id: 7, _abPassPercentage: 10, _status: "published" }],
      publishedDocs: [{ id: 7, _abPassPercentage: 10, _status: "published" }],
    });
    expect(plan.entries[0]?.desired).toBe(30);
  });

  it("treats a missing percentage as zero", () => {
    const plan = buildPercentagePlan({
      pending: {},
      draftDocs: [{ id: "v1", _status: "published" }],
      publishedDocs: [{ id: "v1", _status: "published" }],
    });
    expect(plan.total).toBe(0);
    expect(plan.entries).toEqual([]);
  });
});

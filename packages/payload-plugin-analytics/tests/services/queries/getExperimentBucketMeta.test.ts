import { describe, expect, it, vi } from "vitest";
import { getExperimentBucketMeta } from "../../../src/services/queries/getExperimentBucketMeta";
import type { ResolvedAbConfig } from "../../../src/config/resolveAbConfig";

const ab: ResolvedAbConfig = {
  experimentsCollectionSlug: "ab-experiments",
  dimensions: {
    experiment: "fr_ab_experiment",
    variant: "fr_ab_variant",
    visitorId: "fr_ab_visitor_id",
  },
  stats: { alpha: 0.05, power: 0.8, srmThreshold: 0.001, srmWindowDays: 7 },
  winRate: { mdeCeiling: 0.2, sessionFloor: 100 },
  variantFields: {
    variantOf: "_abVariantOf",
    passPercentage: "_abPassPercentage",
    slug: "slug",
    name: "title",
  },
};

function makeReq(variants: Array<Record<string, unknown>>) {
  return {
    payload: {
      find: vi.fn().mockResolvedValue({ docs: variants }),
    },
  };
}

describe("getExperimentBucketMeta", () => {
  it("maps variant slug->configured share + name and computes control share as the remainder", async () => {
    const req = makeReq([
      { slug: "about--a", _abPassPercentage: 25, title: "Story-led" },
      { slug: "about--b", _abPassPercentage: 25, title: "Social proof" },
    ]);
    const meta = await getExperimentBucketMeta("pages", "p1", "en", ab, req as never);
    expect(meta["about--a"]).toEqual({ configuredShare: 0.25, name: "Story-led" });
    expect(meta["about--b"]).toEqual({ configuredShare: 0.25, name: "Social proof" });
    expect(meta["original"]).toEqual({ configuredShare: 0.5, name: null });
  });

  it("falls back to slug as name when the name field is empty", async () => {
    const req = makeReq([{ slug: "about--a", _abPassPercentage: 50, title: "" }]);
    const meta = await getExperimentBucketMeta("pages", "p1", undefined, ab, req as never);
    expect(meta["about--a"]).toEqual({ configuredShare: 0.5, name: "about--a" });
    expect(meta["original"].configuredShare).toBe(0.5);
  });
});

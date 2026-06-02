import { describe, expect, it } from "vitest";
import { resolveAbConfig } from "../../src/config/resolveAbConfig";

describe("resolveAbConfig", () => {
  it("returns null when no ab block is configured", () => {
    expect(resolveAbConfig(undefined)).toBeNull();
  });

  it("fills documented defaults for an empty block", () => {
    const r = resolveAbConfig({});
    expect(r).not.toBeNull();
    expect(r!.experimentsCollectionSlug).toBe("ab-experiments");
    expect(r!.dimensions).toEqual({
      experiment: "fr_ab_experiment",
      variant: "fr_ab_variant",
      visitorId: "fr_ab_visitor_id",
    });
    expect(r!.stats).toEqual({ alpha: 0.05, power: 0.8, srmThreshold: 0.001, srmWindowDays: 7 });
  });

  it("defaults variantFields and sets name to the slug field when unset", () => {
    const r = resolveAbConfig({});
    expect(r!.variantFields).toEqual({
      variantOf: "_abVariantOf",
      passPercentage: "_abPassPercentage",
      slug: "slug",
      name: "slug",
    });
  });

  it("honors overrides", () => {
    const r = resolveAbConfig({
      experimentsCollectionSlug: "experiments",
      dimensions: { experiment: "x_exp" },
      stats: { alpha: 0.01 },
      variantFields: { slug: "path", name: "title" },
    });
    expect(r!.experimentsCollectionSlug).toBe("experiments");
    expect(r!.dimensions.experiment).toBe("x_exp");
    expect(r!.dimensions.variant).toBe("fr_ab_variant");
    expect(r!.stats.alpha).toBe(0.01);
    expect(r!.stats.power).toBe(0.8);
    expect(r!.variantFields.slug).toBe("path");
    expect(r!.variantFields.name).toBe("title");
    expect(r!.variantFields.variantOf).toBe("_abVariantOf");
  });

  it("fills win-rate defaults and honors overrides", () => {
    expect(resolveAbConfig({})!.winRate).toEqual({ mdeCeiling: 0.2, sessionFloor: 100 });
    const r = resolveAbConfig({ winRate: { mdeCeiling: 0.1 } });
    expect(r!.winRate.mdeCeiling).toBe(0.1);
    expect(r!.winRate.sessionFloor).toBe(100);
  });
});

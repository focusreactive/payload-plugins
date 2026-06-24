import { describe, expect, it } from "vitest";
import {
  shapeExposure,
  shapeOutcome,
  shapeHeader,
  shapeLeadBreakdown,
} from "../../../src/services/queries/shapeAbPanels";
import type { AbExperimentStats } from "../../../src/services/queries/getAbExperimentStats";

const stats: AbExperimentStats = {
  startedAt: "2026-04-20",
  buckets: [
    {
      bucket: "original",
      name: null,
      visitors: 3600,
      sessions: 4200,
      convertingSessions: 357,
      rawConversions: 410,
      configuredShare: 0.5,
    },
    {
      bucket: "pricing--b",
      name: "Annual",
      visitors: 1810,
      sessions: 2100,
      convertingSessions: 252,
      rawConversions: 298,
      configuredShare: 0.5,
    },
  ],
  byBucketLead: { original: { phone_click: 168 }, "pricing--b": { phone_click: 96 } },
};
const ab = {
  stats: { alpha: 0.05, power: 0.8, srmThreshold: 0.001, srmWindowDays: 7 },
  winRate: { mdeCeiling: 0.2, sessionFloor: 100 },
} as never;

describe("shapeExposure", () => {
  it("computes SRM across buckets", () => {
    const out = shapeExposure(stats, ab);
    expect(out.buckets).toHaveLength(2);
    expect(typeof out.srmPassed).toBe("boolean");
    expect(out.srmPValue).toBeGreaterThanOrEqual(0);
  });
});

describe("shapeOutcome", () => {
  it("control row has null lift; variant carries z-test verdict", () => {
    const out = shapeOutcome(stats, ab);
    expect(out.rows[0].relativeLift).toBeNull();
    expect(out.rows[0].verdict).toBeNull();
    const v = out.rows[1];
    expect(v.conversionRate).toBeCloseTo(0.12, 3);
    expect(v.relativeLift).toBeGreaterThan(0.3);
    expect(v.verdict).toBe("winner");
    expect(v.pValue).toBeLessThan(0.05);
    expect(v.confidence).toBeGreaterThan(0.95);
    expect(out.rows[0].confidence).toBeNull();
    expect(out.winnerBucket).toBe("pricing--b");
    expect(out.leaderBucket).toBe("pricing--b");
  });
});

describe("shapeHeader", () => {
  it("computes variant count + MDE from control CR and smallest bucket n", () => {
    const out = shapeHeader(stats, ab, "/en/pricing", "Pricing");
    expect(out.variantCount).toBe(1);
    expect(out.mdeRelative).not.toBeNull();
    expect(out.startedAt).toBe("2026-04-20");
  });
});

describe("shapeLeadBreakdown", () => {
  it("returns rows per present lead type and bucket columns", () => {
    const out = shapeLeadBreakdown(stats);
    expect(out.buckets.map((b) => b.bucket)).toEqual(["original", "pricing--b"]);
    const phone = out.rows.find((r) => r.leadType === "phone_click")!;
    expect(phone.byBucket["original"]).toBe(168);
    expect(phone.byBucket["pricing--b"]).toBe(96);
  });
});

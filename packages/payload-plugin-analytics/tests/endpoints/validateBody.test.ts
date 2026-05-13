import { describe, expect, it } from "vitest";
import { AnalyticsQuerySchema, TopNQuerySchema, SessionsListQuerySchema } from "../../src/endpoints/validateBody";

describe("AnalyticsQuerySchema", () => {
  it("accepts preset dateRange", () => {
    expect(AnalyticsQuerySchema.safeParse({ dateRange: { preset: "last-7d" } }).success).toBe(true);
  });
  it("accepts preset 'last-14d' (default)", () => {
    expect(AnalyticsQuerySchema.safeParse({ dateRange: { preset: "last-14d" } }).success).toBe(true);
  });
  it("accepts custom dateRange", () => {
    expect(AnalyticsQuerySchema.safeParse({ dateRange: { from: "2026-01-01", to: "2026-01-31" } }).success).toBe(true);
  });
  it("rejects missing dateRange", () => {
    expect(AnalyticsQuerySchema.safeParse({}).success).toBe(false);
  });
  it("rejects from > to", () => {
    const r = AnalyticsQuerySchema.safeParse({ dateRange: { from: "2026-02-01", to: "2026-01-01" } });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => /from must be on or before to/i.test(i.message))).toBe(true);
  });
  it("rejects non-ISO date strings", () => {
    expect(AnalyticsQuerySchema.safeParse({ dateRange: { from: "01/01/2026", to: "01/31/2026" } }).success).toBe(false);
  });
  it("accepts comparison kind 'previous-period'", () => {
    expect(
      AnalyticsQuerySchema.safeParse({
        dateRange: { preset: "last-7d" },
        comparison: { kind: "previous-period" },
      }).success,
    ).toBe(true);
  });
  it("rejects unknown comparison kind", () => {
    expect(
      AnalyticsQuerySchema.safeParse({
        dateRange: { preset: "last-7d" },
        comparison: { kind: "year-over-year" },
      }).success,
    ).toBe(false);
  });
});

describe("TopNQuerySchema", () => {
  it("defaults limit to 10 when omitted", () => {
    const r = TopNQuerySchema.parse({ dateRange: { preset: "last-7d" } });
    expect(r.limit).toBe(10);
  });
  it("clamps limit > 100", () => {
    expect(TopNQuerySchema.safeParse({ dateRange: { preset: "last-7d" }, limit: 101 }).success).toBe(false);
  });
  it("rejects limit < 1", () => {
    expect(TopNQuerySchema.safeParse({ dateRange: { preset: "last-7d" }, limit: 0 }).success).toBe(false);
  });
});

describe("SessionsListQuerySchema", () => {
  it("defaults limit to 50, accepts hadLeadAction", () => {
    const r = SessionsListQuerySchema.parse({ dateRange: { preset: "last-7d" }, hadLeadAction: true });
    expect(r.limit).toBe(50);
  });
  it("rejects cursor that is not a string", () => {
    expect(SessionsListQuerySchema.safeParse({ dateRange: { preset: "last-7d" }, cursor: 123 }).success).toBe(false);
  });
  it("rejects limit > 250", () => {
    expect(SessionsListQuerySchema.safeParse({ dateRange: { preset: "last-7d" }, limit: 251 }).success).toBe(false);
  });

  it("accepts source/device/country fields", () => {
    const r = SessionsListQuerySchema.safeParse({
      dateRange: { preset: "last-7d" },
      source: "google",
      device: "mobile",
      country: "US",
    });
    expect(r.success).toBe(true);
  });

  it("rejects an unknown device category", () => {
    const r = SessionsListQuerySchema.safeParse({
      dateRange: { preset: "last-7d" },
      device: "smart-fridge",
    });
    expect(r.success).toBe(false);
  });

  it("rejects an empty source string", () => {
    const r = SessionsListQuerySchema.safeParse({
      dateRange: { preset: "last-7d" },
      source: "",
    });
    expect(r.success).toBe(false);
  });
});

import type { z } from "zod";
import type { AnalyticsQuery, TopNQuery, SessionsListQuery } from "../../src/types/query";

// Compile-time: these `_X` are unused at runtime but force tsc to verify the equivalence.
type _ChkAnalytics = z.infer<typeof AnalyticsQuerySchema> extends AnalyticsQuery ? true : false;
type _ChkTopN = z.infer<typeof TopNQuerySchema> extends TopNQuery ? true : false;
type _ChkSessionList = z.infer<typeof SessionsListQuerySchema> extends SessionsListQuery ? true : false;

// Force usage so tsc doesn't elide them:
const _x1: _ChkAnalytics = true;
const _x2: _ChkTopN = true;
const _x3: _ChkSessionList = true;
void _x1;
void _x2;
void _x3;

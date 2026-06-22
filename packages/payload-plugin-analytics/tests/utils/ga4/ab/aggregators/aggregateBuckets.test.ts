import { describe, expect, it } from "vitest";
import {
  aggregateBucketExposure,
  aggregateBucketConversions,
  aggregateDailyByBucket,
} from "../../../../../src/utils/ga4/ab/aggregators";

type Row = {
  dimensionValues?: Array<{ value?: string | null }>;
  metricValues?: Array<{ value?: string | null }>;
};
const row = (dims: string[], metrics: string[] = []): Row => ({
  dimensionValues: dims.map((value) => ({ value })),
  metricValues: metrics.map((value) => ({ value })),
});

describe("aggregateBucketExposure", () => {
  it("counts distinct sessions and visitors per bucket (dims [variant, sessionId, visitorId])", () => {
    const rows = [
      row(["original", "s1", "v1"]),
      row(["original", "s1", "v1"]), // dup session+visitor
      row(["original", "s2", "v1"]), // same visitor, new session
      row(["about--a", "s3", "v2"]),
    ];
    const out = aggregateBucketExposure(rows);
    expect(out["original"]).toEqual({ sessions: 2, visitors: 1 });
    expect(out["about--a"]).toEqual({ sessions: 1, visitors: 1 });
  });

  it("ignores rows with a missing bucket", () => {
    const out = aggregateBucketExposure([row(["", "s1", "v1"])]);
    expect(out).toEqual({});
  });
});

describe("aggregateBucketConversions", () => {
  it("counts distinct converting sessions + raw event counts per bucket (dims [variant, sessionId, leadType], metric eventCount)", () => {
    const rows = [
      row(["original", "s1", "phone_click"], ["3"]),
      row(["original", "s1", "form_submit"], ["1"]), // same session, still 1 converting session
      row(["original", "s2", "phone_click"], ["2"]),
      row(["about--a", "s3", "email_click"], ["1"]),
    ];
    const out = aggregateBucketConversions(rows);
    expect(out.byBucket["original"]).toEqual({ convertingSessions: 2, rawConversions: 6 });
    expect(out.byBucket["about--a"]).toEqual({ convertingSessions: 1, rawConversions: 1 });
    // per (bucket, leadType) distinct converting sessions
    expect(out.byBucketLead["original"]["phone_click"]).toBe(2);
    expect(out.byBucketLead["original"]["form_submit"]).toBe(1);
    expect(out.byBucketLead["about--a"]["email_click"]).toBe(1);
  });
});

describe("aggregateDailyByBucket", () => {
  it("counts distinct sessions per (date, bucket) (dims [date, variant, sessionId])", () => {
    const rows = [
      row(["20260501", "original", "s1"]),
      row(["20260501", "original", "s1"]),
      row(["20260501", "original", "s2"]),
      row(["20260502", "original", "s3"]),
      row(["20260501", "about--a", "s4"]),
    ];
    const out = aggregateDailyByBucket(rows);
    expect(out["original"]["20260501"]).toBe(2);
    expect(out["original"]["20260502"]).toBe(1);
    expect(out["about--a"]["20260501"]).toBe(1);
  });
});

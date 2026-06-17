import { afterEach, describe, expect, it, vi } from "vitest";
import { getJourneys } from "../../../src/services/queries/getJourneys";
import { __setGa4ClientForTests } from "../../../src/services/ga4DataClient";
import basic from "../../../__fixtures__/ga4/journeys.basic.json";
import truncated from "../../../__fixtures__/ga4/journeys.truncated.json";

afterEach(() => vi.restoreAllMocks());

describe("getJourneys", () => {
  it("requests the documented dim list, ordering, and default sampleLimit", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([basic]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await getJourneys("12345", { dateRange: { preset: "last-7d" }, limit: 20, maxSteps: 8, sampleLimit: 50_000 });
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensions).toEqual([
      { name: "customEvent:fr_session_id" },
      { name: "eventName" },
      { name: "pagePath" },
      { name: "dateHourMinute" },
      { name: "customEvent:fr_event_seq" },
      { name: "customEvent:fr_lead_type" },
    ]);
    expect(arg.orderBys).toEqual([
      { dimension: { dimensionName: "customEvent:fr_session_id" } },
      { dimension: { dimensionName: "dateHourMinute" } },
      { dimension: { dimensionName: "customEvent:fr_event_seq" } },
    ]);
    expect(arg.limit).toBe(50_000);
  });

  it("groups by session, drops sessions with no lead action, fingerprints chains, returns top-N counts", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([basic]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getJourneys("12345", { dateRange: { preset: "last-7d" }, limit: 20, maxSteps: 8, sampleLimit: 50_000 });
    expect(res.sessionsConsidered).toBe(2);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].count).toBe(2);
    expect(res.rows[0].path).toEqual([
      { kind: "page", value: "/" },
      { kind: "page", value: "/pricing" },
      { kind: "leadAction", value: "phone_click" },
    ]);
    expect(res.rows[0].conversionRate).toBeCloseTo(1, 5);
  });

  it("collapses consecutive duplicate page steps", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([basic]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getJourneys("12345", { dateRange: { preset: "last-7d" }, limit: 20, maxSteps: 8, sampleLimit: 50_000 });
    // S1 had two consecutive page_view on "/" — collapsed.
    expect(res.rows[0].path.filter((s) => s.kind === "page" && s.value === "/").length).toBe(1);
  });

  it("caps chain length at maxSteps", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([basic]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getJourneys("12345", { dateRange: { preset: "last-7d" }, limit: 20, maxSteps: 2, sampleLimit: 50_000 });
    expect(res.rows[0].path.length).toBeLessThanOrEqual(2);
  });

  it("sets truncated=true when rowCount exceeds sampleLimit", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([truncated]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getJourneys("12345", { dateRange: { preset: "last-7d" }, limit: 20, maxSteps: 8, sampleLimit: 1000 });
    expect(res.truncated).toBe(true);
  });

  it("returns setupRequired+missing when GA4 errors on customEvent:fr_session_id", async () => {
    const err = new Error("3 INVALID_ARGUMENT: Field customEvent:fr_session_id is unrecognized.");
    const fake = { runReport: vi.fn().mockRejectedValue(err), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getJourneys("12345", { dateRange: { preset: "last-7d" }, limit: 20, maxSteps: 8, sampleLimit: 50_000 });
    expect(res.setupRequired).toBe(true);
    expect(res.missing).toEqual(["fr_session_id"]);
    expect(res.rows).toEqual([]);
    expect(res.sessionsConsidered).toBe(0);
    expect(res.truncated).toBe(false);
  });

  it("returns setupRequired+missing when GA4 errors on customEvent:fr_event_seq", async () => {
    const err = new Error("3 INVALID_ARGUMENT: Field customEvent:fr_event_seq is unrecognized.");
    const fake = { runReport: vi.fn().mockRejectedValue(err), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getJourneys("12345", { dateRange: { preset: "last-7d" }, limit: 20, maxSteps: 8, sampleLimit: 50_000 });
    expect(res.missing).toEqual(["fr_event_seq"]);
  });

  it("returns setupRequired+missing when GA4 errors on customEvent:fr_lead_type", async () => {
    const err = new Error("3 INVALID_ARGUMENT: Field customEvent:fr_lead_type is unrecognized.");
    const fake = { runReport: vi.fn().mockRejectedValue(err), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getJourneys("12345", { dateRange: { preset: "last-7d" }, limit: 20, maxSteps: 8, sampleLimit: 50_000 });
    expect(res.missing).toEqual(["fr_lead_type"]);
  });

  it("rethrows non-setupRequired errors", async () => {
    const err = new Error("3 INVALID_ARGUMENT: bad date format");
    const fake = { runReport: vi.fn().mockRejectedValue(err), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await expect(getJourneys("12345", { dateRange: { preset: "last-7d" }, limit: 20, maxSteps: 8, sampleLimit: 50_000 })).rejects.toBe(err);
  });

  const PAGE_FILTER = {
    refs: ["page:1", "__home"],
    pageRefDim: "customEvent:fr_page_ref",
    contentLocaleDim: "customEvent:fr_content_locale",
  };

  // Two converting sessions: S1 touches only existing refs (kept), S2 touches a deleted ref (dropped).
  const PAGE_FILTER_FIXTURE = {
    dimensionHeaders: [],
    metricHeaders: [{ name: "eventCount", type: "TYPE_INTEGER" }],
    rows: [
      {
        dimensionValues: [{ value: "S1" }, { value: "page_view" }, { value: "/" }, { value: "202605101430" }, { value: "1" }, { value: "" }, { value: "__home" }],
        metricValues: [{ value: "1" }],
      },
      {
        dimensionValues: [{ value: "S1" }, { value: "lead_action" }, { value: "/" }, { value: "202605101430" }, { value: "2" }, { value: "phone_click" }, { value: "__home" }],
        metricValues: [{ value: "1" }],
      },
      {
        dimensionValues: [{ value: "S2" }, { value: "page_view" }, { value: "/gone" }, { value: "202605101500" }, { value: "1" }, { value: "" }, { value: "page:999" }],
        metricValues: [{ value: "1" }],
      },
      {
        dimensionValues: [{ value: "S2" }, { value: "lead_action" }, { value: "/gone" }, { value: "202605101500" }, { value: "2" }, { value: "email_click" }, { value: "page:999" }],
        metricValues: [{ value: "1" }],
      },
    ],
    rowCount: 4,
  };

  it("appends the page-ref dim and excludes a session that touched a deleted ref when pageFilter is set", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([PAGE_FILTER_FIXTURE]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getJourneys("12345", { dateRange: { preset: "last-7d" }, limit: 20, sampleLimit: 50_000 }, PAGE_FILTER);

    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensions).toEqual([
      { name: "customEvent:fr_session_id" },
      { name: "eventName" },
      { name: "pagePath" },
      { name: "dateHourMinute" },
      { name: "customEvent:fr_event_seq" },
      { name: "customEvent:fr_lead_type" },
      { name: "customEvent:fr_page_ref" },
    ]);

    // Only S1 survives; S2 (deleted ref) is not counted nor present.
    expect(res.sessionsConsidered).toBe(1);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].path).toEqual([
      { kind: "page", value: "/" },
      { kind: "leadAction", value: "phone_click" },
    ]);
  });

  it("does NOT append the page-ref dim and counts all sessions when pageFilter is null", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([basic]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getJourneys("12345", { dateRange: { preset: "last-7d" }, limit: 20, maxSteps: 8, sampleLimit: 50_000 }, null);
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensions).toEqual([
      { name: "customEvent:fr_session_id" },
      { name: "eventName" },
      { name: "pagePath" },
      { name: "dateHourMinute" },
      { name: "customEvent:fr_event_seq" },
      { name: "customEvent:fr_lead_type" },
    ]);
    expect(res.sessionsConsidered).toBe(2);
  });

  it("adds fr_page_ref to the catch missing-key candidates", async () => {
    const err = new Error("3 INVALID_ARGUMENT: Field customEvent:fr_page_ref is unrecognized.");
    const fake = { runReport: vi.fn().mockRejectedValue(err), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getJourneys("12345", { dateRange: { preset: "last-7d" }, limit: 20, sampleLimit: 50_000 }, PAGE_FILTER);
    expect(res.setupRequired).toBe(true);
    expect(res.missing).toEqual(["fr_page_ref"]);
  });
});

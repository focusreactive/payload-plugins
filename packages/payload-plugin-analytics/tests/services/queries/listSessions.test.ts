import { afterEach, describe, expect, it, vi } from "vitest";
import { listSessions } from "../../../src/services/queries/listSessions";
import { __setGa4ClientForTests } from "../../../src/services/ga4DataClient";
import sessions from "../../../__fixtures__/ga4/sessions.frSessionId.json";
import merged from "../../../__fixtures__/ga4/sessions.merged.json";

afterEach(() => vi.restoreAllMocks());

const EMPTY_LEAD_REPORT = {
  dimensionHeaders: [{ name: "customEvent:fr_session_id" }],
  metricHeaders: [{ name: "eventCount", type: "TYPE_INTEGER" }],
  rows: [],
  rowCount: 0,
};

function batchWith(sessionsReport: unknown, leadReport: unknown = EMPTY_LEAD_REPORT) {
  return [{ reports: [sessionsReport, leadReport] }];
}

describe("listSessions", () => {
  it("requests customEvent:fr_session_id as the primary dim", async () => {
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockResolvedValue(batchWith(sessions)) };
    __setGa4ClientForTests(fake as never);
    await listSessions("12345", { dateRange: { preset: "last-7d" } });
    const { requests } = fake.batchRunReports.mock.calls[0][0];
    expect(requests[0].dimensions).toEqual([
      { name: "customEvent:fr_session_id" },
      { name: "landingPagePlusQueryString" },
      { name: "sessionSource" },
      { name: "deviceCategory" },
      { name: "country" },
      { name: "customEvent:fr_session_start" },
    ]);
  });

  it("orders by customEvent:fr_session_start desc", async () => {
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockResolvedValue(batchWith(sessions)) };
    __setGa4ClientForTests(fake as never);
    await listSessions("12345", { dateRange: { preset: "last-7d" } });
    const { requests } = fake.batchRunReports.mock.calls[0][0];
    expect(requests[0].orderBys).toEqual([{ dimension: { dimensionName: "customEvent:fr_session_start" }, desc: true }]);
  });

  it("returns the real fr_session_id string as sessionId (no synthetic encoding)", async () => {
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockResolvedValue(batchWith(sessions)) };
    __setGa4ClientForTests(fake as never);
    const res = await listSessions("12345", { dateRange: { preset: "last-7d" } });
    expect(res.rows[0].sessionId).toBe("11111111-2222-4333-8444-555555555555");
    expect(res.rows[1].sessionId).toBe("66666666-7777-4888-8999-aaaaaaaaaaaa");
  });

  it("returns rows + opaque cursor pagination", async () => {
    const oneRowFixture = {
      ...sessions,
      rows: [sessions.rows[0]],
      rowCount: 2,
    };
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockResolvedValue(batchWith(oneRowFixture)) };
    __setGa4ClientForTests(fake as never);
    const res = await listSessions("12345", { dateRange: { preset: "last-7d" }, limit: 1 });
    expect(res.rows.length).toBe(1);
    expect(res.pagination.cursor).not.toBeNull();
    expect(res.pagination.hasMore).toBe(true);
  });

  it("returns setupRequired + missing when GA4 errors on customEvent:fr_session_id", async () => {
    const err = new Error("3 INVALID_ARGUMENT: Field customEvent:fr_session_id is unrecognized.");
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockRejectedValue(err) };
    __setGa4ClientForTests(fake as never);
    const res = await listSessions("12345", { dateRange: { preset: "last-7d" } });
    expect(res.setupRequired).toBe(true);
    expect(res.missing).toEqual(["fr_session_id"]);
    expect(res.rows).toEqual([]);
    expect(res.pagination).toEqual({ cursor: null, hasMore: false });
  });

  it("rethrows non-setupRequired errors", async () => {
    const err = new Error("3 INVALID_ARGUMENT: bad date format");
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockRejectedValue(err) };
    __setGa4ClientForTests(fake as never);
    await expect(listSessions("12345", { dateRange: { preset: "last-7d" } })).rejects.toBe(err);
  });

  it("hadLeadAction=true adds the leadAction inListFilter", async () => {
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockResolvedValue(batchWith(sessions)) };
    __setGa4ClientForTests(fake as never);
    await listSessions("12345", { dateRange: { preset: "last-7d" }, hadLeadAction: true });
    const { requests } = fake.batchRunReports.mock.calls[0][0];
    expect(requests[0].dimensionFilter).toBeDefined();
  });

  it("source filter is applied as a stringFilter on sessionSource", async () => {
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockResolvedValue(batchWith(sessions)) };
    __setGa4ClientForTests(fake as never);
    await listSessions("12345", { dateRange: { preset: "last-7d" }, source: "google" });
    const { requests } = fake.batchRunReports.mock.calls[0][0];
    expect(requests[0].dimensionFilter).toBeDefined();
    const stringify = JSON.stringify(requests[0].dimensionFilter);
    expect(stringify).toContain("sessionSource");
    expect(stringify).toContain("google");
  });

  it("device filter is applied as a stringFilter on deviceCategory", async () => {
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockResolvedValue(batchWith(sessions)) };
    __setGa4ClientForTests(fake as never);
    await listSessions("12345", { dateRange: { preset: "last-7d" }, device: "mobile" });
    const { requests } = fake.batchRunReports.mock.calls[0][0];
    const stringify = JSON.stringify(requests[0].dimensionFilter);
    expect(stringify).toContain("deviceCategory");
    expect(stringify).toContain("mobile");
  });

  it("country filter is applied as a stringFilter on country", async () => {
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockResolvedValue(batchWith(sessions)) };
    __setGa4ClientForTests(fake as never);
    await listSessions("12345", { dateRange: { preset: "last-7d" }, country: "US" });
    const { requests } = fake.batchRunReports.mock.calls[0][0];
    const stringify = JSON.stringify(requests[0].dimensionFilter);
    expect(stringify).toContain("\"country\"");
    expect(stringify).toContain("\"US\"");
  });

  it("combines hadLeadAction with source under andGroup", async () => {
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockResolvedValue(batchWith(sessions)) };
    __setGa4ClientForTests(fake as never);
    await listSessions("12345", { dateRange: { preset: "last-7d" }, hadLeadAction: true, source: "google" });
    const { requests } = fake.batchRunReports.mock.calls[0][0];
    expect(requests[0].dimensionFilter.andGroup).toBeDefined();
    expect(Array.isArray(requests[0].dimensionFilter.andGroup.expressions)).toBe(true);
    expect(requests[0].dimensionFilter.andGroup.expressions.length).toBe(4);
  });

  it("always applies the (not set) exclusion filter for the two custom dims", async () => {
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockResolvedValue(batchWith(sessions)) };
    __setGa4ClientForTests(fake as never);
    await listSessions("12345", { dateRange: { preset: "last-7d" } });
    const { requests } = fake.batchRunReports.mock.calls[0][0];
    expect(requests[0].dimensionFilter).toBeDefined();
    const json = JSON.stringify(requests[0].dimensionFilter);
    expect(json).toContain("notExpression");
    expect(json).toContain("customEvent:fr_session_id");
    expect(json).toContain("customEvent:fr_session_start");
    expect(json).toContain("(not set)");
  });

  it("issues a parallel lead-action session-id query with leadActionFilter", async () => {
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockResolvedValue(batchWith(sessions)) };
    __setGa4ClientForTests(fake as never);
    await listSessions("12345", { dateRange: { preset: "last-7d" } });
    const { requests } = fake.batchRunReports.mock.calls[0][0];
    expect(requests.length).toBe(2);
    expect(requests[1].dimensions).toEqual([{ name: "customEvent:fr_session_id" }]);
    const json = JSON.stringify(requests[1].dimensionFilter);
    expect(json).toContain("eventName");
    expect(json).toContain("lead_action");
  });

  it("derives hadLeadAction per session from the lead-action report", async () => {
    const leadReport = {
      dimensionHeaders: [{ name: "customEvent:fr_session_id" }],
      metricHeaders: [{ name: "eventCount", type: "TYPE_INTEGER" }],
      rows: [
        {
          dimensionValues: [{ value: "11111111-2222-4333-8444-555555555555" }],
          metricValues: [{ value: "1" }],
        },
      ],
      rowCount: 1,
    };
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockResolvedValue(batchWith(sessions, leadReport)) };
    __setGa4ClientForTests(fake as never);
    const res = await listSessions("12345", { dateRange: { preset: "last-7d" } });
    expect(res.rows.find((r) => r.sessionId === "11111111-2222-4333-8444-555555555555")?.hadLeadAction).toBe(true);
    expect(res.rows.find((r) => r.sessionId === "66666666-7777-4888-8999-aaaaaaaaaaaa")?.hadLeadAction).toBe(false);
  });

  it("does NOT take hadLeadAction from query.hadLeadAction — only from the lead-action report", async () => {
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockResolvedValue(batchWith(sessions, EMPTY_LEAD_REPORT)) };
    __setGa4ClientForTests(fake as never);
    const res = await listSessions("12345", { dateRange: { preset: "last-7d" }, hadLeadAction: true });
    expect(res.rows.every((r) => r.hadLeadAction === false)).toBe(true);
  });

  it("merges duplicate rows for one session into arrays for device + country", async () => {
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockResolvedValue(batchWith(merged)) };
    __setGa4ClientForTests(fake as never);
    const res = await listSessions("12345", { dateRange: { preset: "last-7d" } });
    expect(res.rows.length).toBe(1);
    const row = res.rows[0];
    expect(row.sessionId).toBe("aaaaaaaa-1111-4222-8333-444444444444");
    expect(row.deviceCategory).toEqual(["desktop", "mobile"]);
    expect(row.country).toEqual(["United States", "Germany"]);
    expect(row.eventCount).toBe(8);
    expect(row.startedAt).toBe("2026-05-10T16:00:00.000Z");
  });

  it("returns setupRequired + missing when GA4 errors on customEvent:fr_session_start", async () => {
    const err = new Error("3 INVALID_ARGUMENT: Field customEvent:fr_session_start is unrecognized.");
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockRejectedValue(err) };
    __setGa4ClientForTests(fake as never);
    const res = await listSessions("12345", { dateRange: { preset: "last-7d" } });
    expect(res.setupRequired).toBe(true);
    expect(res.missing).toEqual(["fr_session_start"]);
    expect(res.rows).toEqual([]);
  });

  it("merges rows with different fr_session_start into one session, picking the earliest startedAt", async () => {
    const fixture = {
      dimensionHeaders: merged.dimensionHeaders,
      metricHeaders: merged.metricHeaders,
      rows: [
        {
          dimensionValues: [
            { value: "bbbbbbbb-2222-4333-8444-555555555555" },
            { value: "/" },
            { value: "google" },
            { value: "desktop" },
            { value: "US" },
            { value: "2026-05-10T16:00:05.000Z" },
          ],
          metricValues: [{ value: "2" }],
        },
        {
          dimensionValues: [
            { value: "bbbbbbbb-2222-4333-8444-555555555555" },
            { value: "/" },
            { value: "google" },
            { value: "mobile" },
            { value: "US" },
            { value: "2026-05-10T16:00:00.000Z" },
          ],
          metricValues: [{ value: "3" }],
        },
      ],
      rowCount: 2,
    };
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockResolvedValue(batchWith(fixture)) };
    __setGa4ClientForTests(fake as never);
    const res = await listSessions("12345", { dateRange: { preset: "last-7d" } });
    expect(res.rows.length).toBe(1);
    const row = res.rows[0];
    expect(row.sessionId).toBe("bbbbbbbb-2222-4333-8444-555555555555");
    expect(row.eventCount).toBe(5);
    expect(row.startedAt).toBe("2026-05-10T16:00:00.000Z");
  });

  it("skips GA4 rows with empty fr_session_id (defensive guard)", async () => {
    const malformed = {
      dimensionHeaders: [],
      metricHeaders: [{ name: "eventCount", type: "TYPE_INTEGER" }],
      rows: [
        {
          dimensionValues: [
            { value: "" },
            { value: "/" },
            { value: "google" },
            { value: "desktop" },
            { value: "US" },
            { value: "2026-05-10T16:00:00.000Z" },
          ],
          metricValues: [{ value: "1" }],
        },
      ],
      rowCount: 1,
    };
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn().mockResolvedValue(batchWith(malformed)) };
    __setGa4ClientForTests(fake as never);
    const res = await listSessions("12345", { dateRange: { preset: "last-7d" } });
    expect(res.rows).toEqual([]);
  });
});

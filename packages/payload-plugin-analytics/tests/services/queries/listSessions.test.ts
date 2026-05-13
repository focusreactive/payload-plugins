import { afterEach, describe, expect, it, vi } from "vitest";
import { listSessions } from "../../../src/services/queries/listSessions";
import { __setGa4ClientForTests } from "../../../src/services/ga4DataClient";
import sessions from "../../../__fixtures__/ga4/sessions.frSessionId.json";

afterEach(() => vi.restoreAllMocks());

describe("listSessions", () => {
  it("requests customEvent:fr_session_id as the primary dim", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([sessions]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await listSessions("12345", { dateRange: { preset: "last-7d" } });
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensions).toEqual([
      { name: "customEvent:fr_session_id" },
      { name: "landingPagePlusQueryString" },
      { name: "sessionSource" },
      { name: "deviceCategory" },
      { name: "country" },
      { name: "dateHourMinute" },
    ]);
  });

  it("orders by dateHourMinute desc", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([sessions]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await listSessions("12345", { dateRange: { preset: "last-7d" } });
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.orderBys).toEqual([{ dimension: { dimensionName: "dateHourMinute" }, desc: true }]);
  });

  it("returns the real fr_session_id string as sessionId (no synthetic encoding)", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([sessions]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await listSessions("12345", { dateRange: { preset: "last-7d" } });
    expect(res.rows[0].sessionId).toBe("11111111-2222-4333-8444-555555555555");
    expect(res.rows[1].sessionId).toBe("66666666-7777-4888-8999-aaaaaaaaaaaa");
  });

  it("returns rows + opaque cursor pagination", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([sessions]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await listSessions("12345", { dateRange: { preset: "last-7d" }, limit: 1 });
    expect(res.rows.length).toBe(1);
    expect(res.pagination.cursor).not.toBeNull();
    expect(res.pagination.hasMore).toBe(true);
  });

  it("returns setupRequired + missing when GA4 errors on customEvent:fr_session_id", async () => {
    const err = new Error("3 INVALID_ARGUMENT: Field customEvent:fr_session_id is unrecognized.");
    const fake = { runReport: vi.fn().mockRejectedValue(err), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await listSessions("12345", { dateRange: { preset: "last-7d" } });
    expect(res.setupRequired).toBe(true);
    expect(res.missing).toEqual(["fr_session_id"]);
    expect(res.rows).toEqual([]);
    expect(res.pagination).toEqual({ cursor: null, hasMore: false });
  });

  it("rethrows non-setupRequired errors", async () => {
    const err = new Error("3 INVALID_ARGUMENT: bad date format");
    const fake = { runReport: vi.fn().mockRejectedValue(err), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await expect(listSessions("12345", { dateRange: { preset: "last-7d" } })).rejects.toBe(err);
  });

  it("hadLeadAction=true adds the leadAction inListFilter", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([sessions]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await listSessions("12345", { dateRange: { preset: "last-7d" }, hadLeadAction: true });
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensionFilter).toBeDefined();
  });

  it("source filter is applied as a stringFilter on sessionSource", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([sessions]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await listSessions("12345", { dateRange: { preset: "last-7d" }, source: "google" });
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensionFilter).toBeDefined();
    const stringify = JSON.stringify(arg.dimensionFilter);
    expect(stringify).toContain("sessionSource");
    expect(stringify).toContain("google");
  });

  it("device filter is applied as a stringFilter on deviceCategory", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([sessions]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await listSessions("12345", { dateRange: { preset: "last-7d" }, device: "mobile" });
    const arg = fake.runReport.mock.calls[0][0];
    const stringify = JSON.stringify(arg.dimensionFilter);
    expect(stringify).toContain("deviceCategory");
    expect(stringify).toContain("mobile");
  });

  it("country filter is applied as a stringFilter on country", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([sessions]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await listSessions("12345", { dateRange: { preset: "last-7d" }, country: "US" });
    const arg = fake.runReport.mock.calls[0][0];
    const stringify = JSON.stringify(arg.dimensionFilter);
    expect(stringify).toContain("\"country\"");
    expect(stringify).toContain("\"US\"");
  });

  it("combines hadLeadAction with source under andGroup", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([sessions]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await listSessions("12345", { dateRange: { preset: "last-7d" }, hadLeadAction: true, source: "google" });
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensionFilter.andGroup).toBeDefined();
    expect(Array.isArray(arg.dimensionFilter.andGroup.expressions)).toBe(true);
    expect(arg.dimensionFilter.andGroup.expressions.length).toBe(2);
  });

  it("omits dimensionFilter entirely when no filters are set", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([sessions]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await listSessions("12345", { dateRange: { preset: "last-7d" } });
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensionFilter).toBeUndefined();
  });
});

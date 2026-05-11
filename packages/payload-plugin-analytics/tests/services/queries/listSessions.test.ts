import { describe, expect, it, vi } from "vitest";
import { listSessions } from "../../../src/services/queries/listSessions";
import { __setGa4ClientForTests } from "../../../src/services/ga4DataClient";
import { decodeSessionId } from "../../../src/utils/ga4";
import sessions from "../../../__fixtures__/ga4/sessions.json";

describe("listSessions", () => {
  it("requests landing/source/device/country/dateHourMinute dims (no reserved ga_session_id)", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([sessions]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await listSessions("12345", { dateRange: { preset: "last-7d" } });
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensions).toEqual([
      { name: "landingPagePlusQueryString" },
      { name: "sessionSource" },
      { name: "deviceCategory" },
      { name: "country" },
      { name: "dateHourMinute" },
    ]);
  });

  it("orders by dateHourMinute desc for stable, newest-first pagination", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([sessions]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await listSessions("12345", { dateRange: { preset: "last-7d" } });
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.orderBys).toEqual([{ dimension: { dimensionName: "dateHourMinute" }, desc: true }]);
  });

  it("synthesises sessionId from row signature (landing/source/device/country/dhm)", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([sessions]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await listSessions("12345", { dateRange: { preset: "last-7d" } });
    const decoded = decodeSessionId(res.rows[0].sessionId);
    expect(decoded).toEqual({
      dhm: "202605101430",
      src: "google",
      dev: "desktop",
      ctr: "United States",
      lp: "/",
    });
  });

  it("returns rows + opaque cursor pagination", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([sessions]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await listSessions("12345", { dateRange: { preset: "last-7d" }, limit: 1 });
    expect(res.rows.length).toBe(1);
    expect(res.pagination.cursor).not.toBeNull();
    expect(res.pagination.hasMore).toBe(true);
  });

  it("decodes a cursor and applies offset", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([sessions]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const cursor = Buffer.from(JSON.stringify({ offset: 1, queryHash: "anything" })).toString("base64");
    await listSessions("12345", { dateRange: { preset: "last-7d" }, cursor });
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.offset).toBe(1);
  });

  it("propagates SDK errors to the caller", async () => {
    const err = new Error("3 INVALID_ARGUMENT: bad date format");
    const fake = { runReport: vi.fn().mockRejectedValue(err), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await expect(listSessions("12345", { dateRange: { preset: "last-7d" } })).rejects.toBe(err);
  });

  it("hadLeadAction=true adds inListFilter on eventName", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([sessions]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await listSessions("12345", { dateRange: { preset: "last-7d" }, hadLeadAction: true });
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensionFilter).toBeDefined();
  });
});

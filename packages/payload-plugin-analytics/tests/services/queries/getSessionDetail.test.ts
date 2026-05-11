import { afterEach, describe, expect, it, vi } from "vitest";
import { getSessionDetail } from "../../../src/services/queries/getSessionDetail";
import { __setGa4ClientForTests } from "../../../src/services/ga4DataClient";
import sessionDetail from "../../../__fixtures__/ga4/sessionDetail.frSessionId.json";

afterEach(() => vi.restoreAllMocks());

const SESSION_ID = "11111111-2222-4333-8444-555555555555";

describe("getSessionDetail", () => {
  it("queries with exact stringFilter on customEvent:fr_session_id", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([sessionDetail]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await getSessionDetail("12345", SESSION_ID, { dateRange: { preset: "last-7d" } });
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensionFilter).toEqual({
      filter: { fieldName: "customEvent:fr_session_id", stringFilter: { value: SESSION_ID } },
    });
  });

  it("requests eventName, pagePath, dateHourMinute, customEvent:fr_event_seq dims", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([sessionDetail]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await getSessionDetail("12345", SESSION_ID, { dateRange: { preset: "last-7d" } });
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensions).toEqual([
      { name: "eventName" },
      { name: "pagePath" },
      { name: "dateHourMinute" },
      { name: "customEvent:fr_event_seq" },
    ]);
  });

  it("orders by dateHourMinute, then customEvent:fr_event_seq (tiebreaker)", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([sessionDetail]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await getSessionDetail("12345", SESSION_ID, { dateRange: { preset: "last-7d" } });
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.orderBys).toEqual([
      { dimension: { dimensionName: "dateHourMinute" } },
      { dimension: { dimensionName: "customEvent:fr_event_seq" } },
    ]);
  });

  it("maps rows to SessionDetailEvent[] with eventName + pagePath + timestamp", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([sessionDetail]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getSessionDetail("12345", SESSION_ID, { dateRange: { preset: "last-7d" } });
    expect(res.sessionId).toBe(SESSION_ID);
    expect(res.events).toHaveLength(3);
    expect(res.events[0].eventName).toBe("page_view");
    expect(res.events[2].eventName).toBe("phone_click");
    // fr_event_seq is not surfaced in the public shape:
    expect(res.events[0]).not.toHaveProperty("eventSeq");
  });

  it("returns setupRequired + missing on customEvent:fr_session_id INVALID_ARGUMENT", async () => {
    const err = new Error("3 INVALID_ARGUMENT: Field customEvent:fr_session_id is unrecognized.");
    const fake = { runReport: vi.fn().mockRejectedValue(err), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getSessionDetail("12345", SESSION_ID, { dateRange: { preset: "last-7d" } });
    expect(res.setupRequired).toBe(true);
    expect(res.missing).toEqual(["fr_session_id"]);
    expect(res.events).toEqual([]);
  });

  it("returns setupRequired + missing on customEvent:fr_event_seq INVALID_ARGUMENT", async () => {
    const err = new Error("3 INVALID_ARGUMENT: Field customEvent:fr_event_seq is unrecognized.");
    const fake = { runReport: vi.fn().mockRejectedValue(err), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getSessionDetail("12345", SESSION_ID, { dateRange: { preset: "last-7d" } });
    expect(res.missing).toEqual(["fr_event_seq"]);
  });

  it("rethrows non-setupRequired errors", async () => {
    const err = new Error("3 INVALID_ARGUMENT: bad date format");
    const fake = { runReport: vi.fn().mockRejectedValue(err), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await expect(getSessionDetail("12345", SESSION_ID, { dateRange: { preset: "last-7d" } })).rejects.toBe(err);
  });
});

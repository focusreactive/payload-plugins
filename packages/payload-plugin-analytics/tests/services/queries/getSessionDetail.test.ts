import { afterEach, describe, expect, it, vi } from "vitest";
import { getSessionDetail } from "../../../src/services/queries/getSessionDetail";
import { __setGa4ClientForTests } from "../../../src/services/ga4DataClient";
import sessionDetail from "../../../__fixtures__/ga4/sessionDetail.frSessionId.json";

afterEach(() => vi.restoreAllMocks());

const SESSION_ID = "11111111-2222-4333-8444-555555555555";

describe("getSessionDetail", () => {
  it("queries with exact stringFilter on customEvent:fr_session_id", async () => {
    const fake = {
      runReport: vi.fn().mockResolvedValue([sessionDetail]),
      batchRunReports: vi.fn(),
    };
    __setGa4ClientForTests(fake as never);
    await getSessionDetail("12345", SESSION_ID, { dateRange: { preset: "last-7d" } });
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensionFilter).toEqual({
      filter: { fieldName: "customEvent:fr_session_id", stringFilter: { value: SESSION_ID } },
    });
  });

  it("requests eventName, pagePath, dateHourMinute, fr_event_seq, fr_lead_type dims", async () => {
    const fake = {
      runReport: vi.fn().mockResolvedValue([sessionDetail]),
      batchRunReports: vi.fn(),
    };
    __setGa4ClientForTests(fake as never);
    await getSessionDetail("12345", SESSION_ID, { dateRange: { preset: "last-7d" } });
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensions).toEqual([
      { name: "eventName" },
      { name: "pagePath" },
      { name: "dateHourMinute" },
      { name: "customEvent:fr_event_seq" },
      { name: "customEvent:fr_lead_type" },
    ]);
  });

  it("orders by dateHourMinute, then customEvent:fr_event_seq (tiebreaker)", async () => {
    const fake = {
      runReport: vi.fn().mockResolvedValue([sessionDetail]),
      batchRunReports: vi.fn(),
    };
    __setGa4ClientForTests(fake as never);
    await getSessionDetail("12345", SESSION_ID, { dateRange: { preset: "last-7d" } });
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.orderBys).toEqual([
      { dimension: { dimensionName: "dateHourMinute" } },
      { dimension: { dimensionName: "customEvent:fr_event_seq" } },
    ]);
  });

  it("maps rows to SessionDetailEvent[] with eventName + pagePath + timestamp", async () => {
    const fake = {
      runReport: vi.fn().mockResolvedValue([sessionDetail]),
      batchRunReports: vi.fn(),
    };
    __setGa4ClientForTests(fake as never);
    const res = await getSessionDetail("12345", SESSION_ID, { dateRange: { preset: "last-7d" } });
    expect(res.sessionId).toBe(SESSION_ID);
    expect(res.events).toHaveLength(3);
    expect(res.events[0].eventName).toBe("page_view");
    expect(res.events[2].eventName).toBe("lead_action");
    // fr_event_seq is not surfaced in the public shape:
    expect(res.events[0]).not.toHaveProperty("eventSeq");
  });

  it("surfaces fr_lead_type on lead_action events as params.fr_lead_type", async () => {
    const fake = {
      runReport: vi.fn().mockResolvedValue([sessionDetail]),
      batchRunReports: vi.fn(),
    };
    __setGa4ClientForTests(fake as never);
    const res = await getSessionDetail("12345", SESSION_ID, { dateRange: { preset: "last-7d" } });
    expect(res.events[2].params).toEqual({ fr_lead_type: "phone_click" });
    expect(res.events[0].params).toEqual({});
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

  it("retries without fr_lead_type and surfaces missing when only fr_lead_type is unregistered", async () => {
    const err = new Error("3 INVALID_ARGUMENT: Field customEvent:fr_lead_type is unrecognized.");
    const fallback = {
      ...sessionDetail,
      dimensionHeaders: sessionDetail.dimensionHeaders.slice(0, 4),
      rows: sessionDetail.rows.map((row) => ({
        ...row,
        dimensionValues: row.dimensionValues.slice(0, 4),
      })),
    };
    const runReport = vi.fn().mockRejectedValueOnce(err).mockResolvedValueOnce([fallback]);
    const fake = { runReport, batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);

    const res = await getSessionDetail("12345", SESSION_ID, { dateRange: { preset: "last-7d" } });

    expect(runReport).toHaveBeenCalledTimes(2);
    const retryDims = runReport.mock.calls[1][0].dimensions;
    expect(retryDims).toEqual([
      { name: "eventName" },
      { name: "pagePath" },
      { name: "dateHourMinute" },
      { name: "customEvent:fr_event_seq" },
    ]);
    expect(res.setupRequired).toBeUndefined();
    expect(res.missing).toEqual(["fr_lead_type"]);
    expect(res.events).toHaveLength(3);
    expect(res.events[2].params).toEqual({});
  });

  it("rethrows non-setupRequired errors", async () => {
    const err = new Error("3 INVALID_ARGUMENT: bad date format");
    const fake = { runReport: vi.fn().mockRejectedValue(err), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await expect(
      getSessionDetail("12345", SESSION_ID, { dateRange: { preset: "last-7d" } })
    ).rejects.toBe(err);
  });

  const PAGE_FILTER = {
    refs: ["page:1", "__home"],
    pageRefDim: "customEvent:fr_page_ref",
    contentLocaleDim: "customEvent:fr_content_locale",
    resolveLabels: async () => new Map(),
  };

  function detailFixture(ref: string) {
    return {
      dimensionHeaders: [],
      metricHeaders: [{ name: "eventCount", type: "TYPE_INTEGER" }],
      rows: [
        {
          dimensionValues: [
            { value: "page_view" },
            { value: "/" },
            { value: "202605101430" },
            { value: "1" },
            { value: "" },
            { value: ref },
          ],
          metricValues: [{ value: "1" }],
        },
        {
          dimensionValues: [
            { value: "scroll" },
            { value: "/" },
            { value: "202605101430" },
            { value: "2" },
            { value: "" },
            { value: ref },
          ],
          metricValues: [{ value: "1" }],
        },
        {
          dimensionValues: [
            { value: "lead_action" },
            { value: "/" },
            { value: "202605101430" },
            { value: "3" },
            { value: "phone_click" },
            { value: ref },
          ],
          metricValues: [{ value: "1" }],
        },
      ],
      rowCount: 3,
    };
  }

  it("appends the page-ref dim and returns events for a clean session when pageFilter is set", async () => {
    const fake = {
      runReport: vi.fn().mockResolvedValue([detailFixture("__home")]),
      batchRunReports: vi.fn(),
    };
    __setGa4ClientForTests(fake as never);
    const res = await getSessionDetail(
      "12345",
      SESSION_ID,
      { dateRange: { preset: "last-7d" } },
      PAGE_FILTER
    );

    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensions).toEqual([
      { name: "eventName" },
      { name: "pagePath" },
      { name: "dateHourMinute" },
      { name: "customEvent:fr_event_seq" },
      { name: "customEvent:fr_lead_type" },
      { name: "customEvent:fr_page_ref" },
    ]);
    expect(res.sessionId).toBe(SESSION_ID);
    expect(res.events).toHaveLength(3);
  });

  it("returns empty events when the session touched a deleted ref", async () => {
    const fake = {
      runReport: vi.fn().mockResolvedValue([detailFixture("page:999")]),
      batchRunReports: vi.fn(),
    };
    __setGa4ClientForTests(fake as never);
    const res = await getSessionDetail(
      "12345",
      SESSION_ID,
      { dateRange: { preset: "last-7d" } },
      PAGE_FILTER
    );
    expect(res.sessionId).toBe(SESSION_ID);
    expect(res.events).toEqual([]);
  });

  function detailFixtureNoLeadType(ref: string) {
    return {
      dimensionHeaders: [],
      metricHeaders: [{ name: "eventCount", type: "TYPE_INTEGER" }],
      rows: [
        {
          dimensionValues: [
            { value: "page_view" },
            { value: "/" },
            { value: "202605101430" },
            { value: "1" },
            { value: ref },
          ],
          metricValues: [{ value: "1" }],
        },
        {
          dimensionValues: [
            { value: "scroll" },
            { value: "/" },
            { value: "202605101430" },
            { value: "2" },
            { value: ref },
          ],
          metricValues: [{ value: "1" }],
        },
        {
          dimensionValues: [
            { value: "lead_action" },
            { value: "/" },
            { value: "202605101430" },
            { value: "3" },
            { value: ref },
          ],
          metricValues: [{ value: "1" }],
        },
      ],
      rowCount: 3,
    };
  }

  it("excludes a deleted-ref session on the fr_lead_type-less fallback path (ref at index 4)", async () => {
    // why: first call rejects with the fr_lead_type-only error → deriveMissing yields
    // ["fr_lead_type"] → retry without lead-type. The retry returns rows whose ref
    // column is now at index 4 and points at a DELETED ref → events must be excluded.
    const err = new Error("3 INVALID_ARGUMENT: Field customEvent:fr_lead_type is unrecognized.");
    const runReport = vi
      .fn()
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce([detailFixtureNoLeadType("page:999")]);
    const fake = { runReport, batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);

    const res = await getSessionDetail(
      "12345",
      SESSION_ID,
      { dateRange: { preset: "last-7d" } },
      PAGE_FILTER
    );

    expect(runReport).toHaveBeenCalledTimes(2);
    const retryDims = runReport.mock.calls[1][0].dimensions;
    expect(retryDims).toEqual([
      { name: "eventName" },
      { name: "pagePath" },
      { name: "dateHourMinute" },
      { name: "customEvent:fr_event_seq" },
      { name: "customEvent:fr_page_ref" },
    ]);
    expect(res.setupRequired).toBeUndefined();
    expect(res.missing).toEqual(["fr_lead_type"]);
    expect(res.events).toEqual([]);
  });

  it("does NOT append the page-ref dim and returns full events when pageFilter is null", async () => {
    const fake = {
      runReport: vi.fn().mockResolvedValue([sessionDetail]),
      batchRunReports: vi.fn(),
    };
    __setGa4ClientForTests(fake as never);
    const res = await getSessionDetail(
      "12345",
      SESSION_ID,
      { dateRange: { preset: "last-7d" } },
      null
    );
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensions).toEqual([
      { name: "eventName" },
      { name: "pagePath" },
      { name: "dateHourMinute" },
      { name: "customEvent:fr_event_seq" },
      { name: "customEvent:fr_lead_type" },
    ]);
    expect(res.events).toHaveLength(3);
  });
});

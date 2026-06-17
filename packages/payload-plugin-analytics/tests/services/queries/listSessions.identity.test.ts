import { afterEach, describe, expect, it, vi } from "vitest";
import { listSessions } from "../../../src/services/queries/listSessions";
import { __setGa4ClientForTests } from "../../../src/services/ga4DataClient";
import type { PageFilterContext } from "../../../src/services/pageFilter/types";

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

const pageFilter: PageFilterContext = {
  refs: ["pages:1", "pages:2"],
  pageRefDim: "customEvent:fr_page_ref",
  contentLocaleDim: "customEvent:fr_content_locale",
  // Landing ref (pages:1) resolves; the later ref (pages:2) intentionally does not.
  resolveLabels: async () => new Map([["pages:1", { path: "/why-pick-us", title: "Why Pick Us" }]]),
};

// Session A spans two existing refs; both are kept by excludeDeletedSessions.
const SESSIONS_FIXTURE = {
  dimensionHeaders: [],
  metricHeaders: [{ name: "eventCount", type: "TYPE_INTEGER" }],
  rows: [
    {
      dimensionValues: [{ value: "A" }, { value: "/raw-landing?x=1" }, { value: "google" }, { value: "desktop" }, { value: "US" }, { value: "2026-05-10T16:00:00.000Z" }, { value: "pages:1" }],
      metricValues: [{ value: "1" }],
    },
    {
      dimensionValues: [{ value: "A" }, { value: "/raw-landing?x=1" }, { value: "google" }, { value: "desktop" }, { value: "US" }, { value: "2026-05-10T16:00:00.000Z" }, { value: "pages:2" }],
      metricValues: [{ value: "1" }],
    },
  ],
  rowCount: 2,
};

describe("listSessions landing-page identity resolution", () => {
  it("resolves landingPage from the FIRST/earliest page_view ref, not a later ref in the session", async () => {
    // Ordered event-level rows: pages:1 is the landing (first) event; pages:2 is later.
    const landingReport = {
      rows: [
        { dimensionValues: [{ value: "A" }, { value: "pages:1" }, { value: "202605101600" }, { value: "1" }], metricValues: [{ value: "1" }] },
        { dimensionValues: [{ value: "A" }, { value: "pages:2" }, { value: "202605101605" }, { value: "2" }], metricValues: [{ value: "1" }] },
      ],
    };
    const fake = {
      batchRunReports: vi.fn().mockResolvedValue(batchWith(SESSIONS_FIXTURE)),
      runReport: vi.fn().mockResolvedValue([landingReport]),
    };
    __setGa4ClientForTests(fake as never);

    const res = await listSessions("12345", { dateRange: { preset: "last-7d" } }, pageFilter);

    const rowA = res.rows.find((r) => r.sessionId === "A");
    expect(rowA?.landingPage).toBe("/why-pick-us");

    // Supplementary landing-refs query was issued with the right shape.
    // runQuery.runReport forwards { ...request, property } as one arg to the client.
    expect(fake.runReport).toHaveBeenCalledTimes(1);
    const request = fake.runReport.mock.calls[0][0];
    expect(request.property).toBe("properties/12345");
    expect(request.dimensions).toEqual([{ name: "customEvent:fr_session_id" }, { name: "customEvent:fr_page_ref" }, { name: "dateHourMinute" }, { name: "customEvent:fr_event_seq" }]);
    const json = JSON.stringify(request.dimensionFilter);
    expect(json).toContain("page_view");
    expect(json).toContain('"A"');
  });

  it("falls back to the raw GA4 landingPagePlusQueryString when the landing-refs query rejects", async () => {
    const fake = {
      batchRunReports: vi.fn().mockResolvedValue(batchWith(SESSIONS_FIXTURE)),
      runReport: vi.fn().mockRejectedValue(new Error("boom")),
    };
    __setGa4ClientForTests(fake as never);

    const res = await listSessions("12345", { dateRange: { preset: "last-7d" } }, pageFilter);

    const rowA = res.rows.find((r) => r.sessionId === "A");
    expect(rowA?.landingPage).toBe("/raw-landing?x=1");
  });

  it("does NOT issue a sessionLandingRefs query and keeps the raw GA4 landingPage when pageFilter is null", async () => {
    const fixture = {
      dimensionHeaders: [],
      metricHeaders: [{ name: "eventCount", type: "TYPE_INTEGER" }],
      rows: [
        {
          dimensionValues: [{ value: "A" }, { value: "/raw-landing?x=1" }, { value: "google" }, { value: "desktop" }, { value: "US" }, { value: "2026-05-10T16:00:00.000Z" }],
          metricValues: [{ value: "1" }],
        },
      ],
      rowCount: 1,
    };
    const fake = {
      batchRunReports: vi.fn().mockResolvedValue(batchWith(fixture)),
      runReport: vi.fn(),
    };
    __setGa4ClientForTests(fake as never);

    const res = await listSessions("12345", { dateRange: { preset: "last-7d" } }, null);

    expect(fake.runReport).not.toHaveBeenCalled();
    expect(res.rows[0].landingPage).toBe("/raw-landing?x=1");
  });
});

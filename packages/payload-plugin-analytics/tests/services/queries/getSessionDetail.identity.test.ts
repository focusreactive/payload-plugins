import { afterEach, describe, expect, it, vi } from "vitest";
import { getSessionDetail } from "../../../src/services/queries/getSessionDetail";
import { __setGa4ClientForTests } from "../../../src/services/ga4DataClient";
import type { PageFilterContext } from "../../../src/services/pageFilter/types";

afterEach(() => vi.restoreAllMocks());

const SESSION_ID = "11111111-2222-4333-8444-555555555555";

const pageFilter: PageFilterContext = {
  refs: ["pages:1", "__home"],
  pageRefDim: "customEvent:fr_page_ref",
  contentLocaleDim: "customEvent:fr_content_locale",
  resolveLabels: async () =>
    new Map([
      ["__home", { path: "/", title: "Home" }],
      ["pages:1", { path: "/why-pick-us", title: "Why Pick Us" }],
    ]),
};

// Session whose refs all exist; the raw GA4 pagePath (/old-pricing) is historical and must be
// replaced by the resolved label path keyed on the event row's ref.
function fixture() {
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
          { value: "__home" },
        ],
        metricValues: [{ value: "1" }],
      },
      {
        dimensionValues: [
          { value: "page_view" },
          { value: "/old-pricing" },
          { value: "202605101431" },
          { value: "2" },
          { value: "" },
          { value: "pages:1" },
        ],
        metricValues: [{ value: "1" }],
      },
      {
        dimensionValues: [
          { value: "lead_action" },
          { value: "/old-pricing" },
          { value: "202605101431" },
          { value: "3" },
          { value: "phone_click" },
          { value: "pages:1" },
        ],
        metricValues: [{ value: "1" }],
      },
    ],
    rowCount: 3,
  };
}

describe("getSessionDetail identity labels", () => {
  it("labels each event pagePath via resolveLabels by the row's ref", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([fixture()]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);

    const res = await getSessionDetail(
      "12345",
      SESSION_ID,
      { dateRange: { preset: "last-7d" } },
      pageFilter
    );

    expect(res.events).toHaveLength(3);
    expect(res.events.map((e) => e.pagePath)).toEqual(["/", "/why-pick-us", "/why-pick-us"]);
  });
});

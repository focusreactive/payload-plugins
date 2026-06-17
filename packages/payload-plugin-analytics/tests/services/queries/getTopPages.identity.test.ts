import { describe, expect, it, vi } from "vitest";
import { getTopPages } from "../../../src/services/queries/getTopPages";
import { __setGa4ClientForTests } from "../../../src/services/ga4DataClient";
import type { PageFilterContext } from "../../../src/services/pageFilter/types";

const pageFilter: PageFilterContext = {
  refs: ["pages:1", "pages:2"],
  pageRefDim: "customEvent:fr_page_ref",
  contentLocaleDim: "customEvent:fr_content_locale",
  resolveLabels: async () => new Map([["pages:1", { path: "/why-pick-us", title: "Why Pick Us" }]]),
};

describe("getTopPages identity grouping", () => {
  it("groups by fr_page_ref and labels rows with resolved path/title", async () => {
    // Two GA4 rows for the SAME ref under different historical paths → must consolidate.
    const fixture = {
      rows: [
        { dimensionValues: [{ value: "pages:1" }], metricValues: [{ value: "100" }, { value: "60" }, { value: "30" }] },
        { dimensionValues: [{ value: "pages:1" }], metricValues: [{ value: "40" }, { value: "20" }, { value: "31" }] },
      ],
    };
    const fake = { runReport: vi.fn().mockResolvedValue([fixture]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);

    const res = await getTopPages("123", { dateRange: { preset: "last-7d" } }, pageFilter);
    // request grouped by the ref dim
    expect(fake.runReport.mock.calls[0][0].dimensions).toEqual([{ name: "customEvent:fr_page_ref" }]);
    // existence inList filter on the ref dim
    expect(fake.runReport.mock.calls[0][0].dimensionFilter).toEqual({ filter: { fieldName: "customEvent:fr_page_ref", inListFilter: { values: ["pages:1", "pages:2"] } } });
    // one consolidated row, labeled from CMS
    expect(res.rows).toEqual([{ pagePath: "/why-pick-us", pageTitle: "Why Pick Us", pageViews: 140, sessions: 80, avgTime: expect.any(Number) }]);
  });

  it("falls back to the ref string when a label is missing", async () => {
    const fixture = {
      rows: [{ dimensionValues: [{ value: "pages:2" }], metricValues: [{ value: "10" }, { value: "5" }, { value: "12" }] }],
    };
    const fake = { runReport: vi.fn().mockResolvedValue([fixture]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);

    const res = await getTopPages("123", { dateRange: { preset: "last-7d" } }, pageFilter);
    expect(res.rows).toEqual([{ pagePath: "pages:2", pageTitle: "pages:2", pageViews: 10, sessions: 5, avgTime: 12 }]);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { getJourneys } from "../../../src/services/queries/getJourneys";
import { __setGa4ClientForTests } from "../../../src/services/ga4DataClient";
import type { PageFilterContext } from "../../../src/services/pageFilter/types";

afterEach(() => vi.restoreAllMocks());

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

// Two converting sessions hit the SAME ref (pages:1) under DIFFERENT historical pagePaths
// (/old-pricing vs /pricing). Identity grouping must collapse them to one journey labeled
// by the resolved path (/why-pick-us).
const FIXTURE = {
  dimensionHeaders: [],
  metricHeaders: [{ name: "eventCount", type: "TYPE_INTEGER" }],
  rows: [
    { dimensionValues: [{ value: "S1" }, { value: "page_view" }, { value: "/" }, { value: "202605101430" }, { value: "1" }, { value: "" }, { value: "__home" }], metricValues: [{ value: "1" }] },
    {
      dimensionValues: [{ value: "S1" }, { value: "page_view" }, { value: "/old-pricing" }, { value: "202605101431" }, { value: "2" }, { value: "" }, { value: "pages:1" }],
      metricValues: [{ value: "1" }],
    },
    {
      dimensionValues: [{ value: "S1" }, { value: "lead_action" }, { value: "/old-pricing" }, { value: "202605101431" }, { value: "3" }, { value: "phone_click" }, { value: "pages:1" }],
      metricValues: [{ value: "1" }],
    },
    { dimensionValues: [{ value: "S2" }, { value: "page_view" }, { value: "/" }, { value: "202605101500" }, { value: "1" }, { value: "" }, { value: "__home" }], metricValues: [{ value: "1" }] },
    {
      dimensionValues: [{ value: "S2" }, { value: "page_view" }, { value: "/pricing" }, { value: "202605101501" }, { value: "2" }, { value: "" }, { value: "pages:1" }],
      metricValues: [{ value: "1" }],
    },
    {
      dimensionValues: [{ value: "S2" }, { value: "lead_action" }, { value: "/pricing" }, { value: "202605101501" }, { value: "3" }, { value: "phone_click" }, { value: "pages:1" }],
      metricValues: [{ value: "1" }],
    },
  ],
  rowCount: 6,
};

describe("getJourneys identity labels", () => {
  it("labels page steps by resolved path and consolidates differing historical pagePaths", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([FIXTURE]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);

    const res = await getJourneys("12345", { dateRange: { preset: "last-7d" }, limit: 20, sampleLimit: 50_000 }, pageFilter);

    expect(res.sessionsConsidered).toBe(2);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].count).toBe(2);
    expect(res.rows[0].path).toEqual([
      { kind: "page", value: "/" },
      { kind: "page", value: "/why-pick-us" },
      { kind: "leadAction", value: "phone_click" },
    ]);
  });
});

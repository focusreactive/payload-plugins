import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLeadActions } from "../../../src/services/queries/getLeadActions";
import { __setGa4ClientForTests } from "../../../src/services/ga4DataClient";
import { setPluginConfig } from "../../../src/config";
import type { PageFilterContext } from "../../../src/services/pageFilter/types";

const pageFilter: PageFilterContext = {
  refs: ["pages:1"],
  pageRefDim: "customEvent:fr_page_ref",
  contentLocaleDim: "customEvent:fr_content_locale",
  resolveLabels: async () => new Map([["pages:1", { path: "/why-pick-us", title: "Why Pick Us" }]]),
};

beforeEach(() => {
  setPluginConfig({
    ga4: {
      propertyId: "1",
      measurementId: "G-X",
      serviceAccount: { clientEmail: "", privateKey: "" },
    },
    leadActions: { types: ["phone_click"] },
  });
});

describe("getLeadActions perPage identity", () => {
  it("requests fr_page_ref as the second events dim and keys perPage by resolved label path", async () => {
    const events = {
      rows: [
        {
          dimensionValues: [{ value: "phone_click" }, { value: "pages:1" }],
          metricValues: [{ value: "7" }, { value: "1200" }],
        },
      ],
    };
    const sessions = { rows: [{ metricValues: [{ value: "100" }] }] };
    const fake = {
      runReport: vi.fn(),
      batchRunReports: vi.fn().mockResolvedValue([{ reports: [events, sessions] }]),
    };
    __setGa4ClientForTests(fake as never);

    const res = await getLeadActions("1", { dateRange: { preset: "last-7d" } }, pageFilter);
    const eventsReqDims = fake.batchRunReports.mock.calls[0][0].requests[0].dimensions;
    expect(eventsReqDims).toEqual([
      { name: "customEvent:fr_lead_type" },
      { name: "customEvent:fr_page_ref" },
    ]);
    expect(res.current.perPage).toEqual([{ pagePath: "/why-pick-us", counts: { phone_click: 7 } }]);
  });

  it("consolidates two historical pagePaths for the same ref into one perPage row", async () => {
    const events = {
      rows: [
        {
          dimensionValues: [{ value: "phone_click" }, { value: "pages:1" }],
          metricValues: [{ value: "4" }, { value: "1000" }],
        },
        {
          dimensionValues: [{ value: "phone_click" }, { value: "pages:1" }],
          metricValues: [{ value: "3" }, { value: "2000" }],
        },
      ],
    };
    const sessions = { rows: [{ metricValues: [{ value: "50" }] }] };
    const fake = {
      runReport: vi.fn(),
      batchRunReports: vi.fn().mockResolvedValue([{ reports: [events, sessions] }]),
    };
    __setGa4ClientForTests(fake as never);

    const res = await getLeadActions("1", { dateRange: { preset: "last-7d" } }, pageFilter);
    expect(res.current.perPage).toEqual([{ pagePath: "/why-pick-us", counts: { phone_click: 7 } }]);
    expect(res.current.totals.phone_click).toBe(7);
  });

  it("falls back to the ref string when a label is missing", async () => {
    const events = {
      rows: [
        {
          dimensionValues: [{ value: "phone_click" }, { value: "pages:2" }],
          metricValues: [{ value: "5" }, { value: "900" }],
        },
      ],
    };
    const sessions = { rows: [{ metricValues: [{ value: "100" }] }] };
    const fake = {
      runReport: vi.fn(),
      batchRunReports: vi.fn().mockResolvedValue([{ reports: [events, sessions] }]),
    };
    __setGa4ClientForTests(fake as never);

    const res = await getLeadActions("1", { dateRange: { preset: "last-7d" } }, pageFilter);
    expect(res.current.perPage).toEqual([{ pagePath: "pages:2", counts: { phone_click: 5 } }]);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLeadActions } from "../../../src/services/queries/getLeadActions";
import { __setGa4ClientForTests } from "../../../src/services/ga4DataClient";
import { setPluginConfig } from "../../../src/config";
import withMetric from "../../../__fixtures__/ga4/leadActions.batch.elapsedMs.json";
import withoutMetric from "../../../__fixtures__/ga4/leadActions.batch.noElapsedMs.json";

// DEVIATION FROM PLAN §Phase 5 VERBATIM TEST:
// The plan asserted `mock.calls[0][0]` as the requests array, but `runQuery.batchRunReports`
// invokes the GA4 client as `client.batchRunReports({ property, requests })` — a single object arg —
// so the requests array lives on `.requests`. Same workaround as the prior version of this file.

beforeEach(() => {
  // getLeadActions now calls getPluginConfig() directly to resolve leadAction types.
  // Provide a minimal config so the call does not throw in tests.
  setPluginConfig({
    ga4: {
      propertyId: "12345",
      measurementId: "G-TEST",
      serviceAccount: { clientEmail: "test@test.com", privateKey: "key" },
    },
  });
});

afterEach(() => vi.restoreAllMocks());

describe("getLeadActions", () => {
  it("requests customEvent:fr_lead_type as the first dimension (not eventName)", async () => {
    const fake = {
      runReport: vi.fn(),
      batchRunReports: vi.fn().mockResolvedValue([withMetric]),
    };
    __setGa4ClientForTests(fake as never);
    await getLeadActions("12345", { dateRange: { preset: "last-7d" } });
    const requests = fake.batchRunReports.mock.calls[0][0].requests;
    expect(requests[0].dimensions).toEqual([
      { name: "customEvent:fr_lead_type" },
      { name: "pagePath" },
    ]);
  });

  it("requests averageCustomEvent:fr_elapsed_ms as the second metric", async () => {
    const fake = {
      runReport: vi.fn(),
      batchRunReports: vi.fn().mockResolvedValue([withMetric]),
    };
    __setGa4ClientForTests(fake as never);
    await getLeadActions("12345", { dateRange: { preset: "last-7d" } });
    const requests = fake.batchRunReports.mock.calls[0][0].requests;
    expect(requests[0].metrics).toEqual([
      { name: "eventCount" },
      { name: "averageCustomEvent:fr_elapsed_ms" },
    ]);
  });

  it("computes count-weighted mean in seconds", async () => {
    const fake = {
      runReport: vi.fn(),
      batchRunReports: vi.fn().mockResolvedValue([withMetric]),
    };
    __setGa4ClientForTests(fake as never);
    const res = await getLeadActions("12345", { dateRange: { preset: "last-7d" } });
    // (10 * 8000 + 5 * 12000) / 15 / 1000 = 9.3333…
    expect(res.current.avgTimeToAction).toBeCloseTo(9.333, 2);
  });

  it("totals and conversionRate are correct alongside avgTimeToAction", async () => {
    const fake = {
      runReport: vi.fn(),
      batchRunReports: vi.fn().mockResolvedValue([withMetric]),
    };
    __setGa4ClientForTests(fake as never);
    const res = await getLeadActions("12345", { dateRange: { preset: "last-7d" } });
    expect(res.current.totals.phone_click).toBe(10);
    expect(res.current.totals.form_submit).toBe(5);
    expect(res.current.conversionRate.phone_click).toBeCloseTo(0.1, 5);
  });

  it("totals only contains keys that appeared in data (no zero pre-population for absent types)", async () => {
    const fake = {
      runReport: vi.fn(),
      batchRunReports: vi.fn().mockResolvedValue([withMetric]),
    };
    __setGa4ClientForTests(fake as never);
    const res = await getLeadActions("12345", { dateRange: { preset: "last-7d" } });
    // Fixture only has phone_click and form_submit rows — absent types must NOT appear
    expect(Object.keys(res.current.totals)).toEqual(["phone_click", "form_submit"]);
    expect(res.current.totals.booking_click).toBeUndefined();
    expect(res.current.totals.email_click).toBeUndefined();
  });

  it("retries without the metric on INVALID_ARGUMENT for averageCustomEvent:fr_elapsed_ms", async () => {
    const err = new Error(
      "3 INVALID_ARGUMENT: Field averageCustomEvent:fr_elapsed_ms is unrecognized."
    );
    const fake = {
      runReport: vi.fn(),
      batchRunReports: vi.fn().mockRejectedValueOnce(err).mockResolvedValueOnce([withoutMetric]),
    };
    __setGa4ClientForTests(fake as never);
    const res = await getLeadActions("12345", { dateRange: { preset: "last-7d" } });
    expect(fake.batchRunReports).toHaveBeenCalledTimes(2);
    const retryRequests = fake.batchRunReports.mock.calls[1][0].requests;
    expect(retryRequests[0].metrics).toEqual([{ name: "eventCount" }]);
    expect(res.current.avgTimeToAction).toBeNull();
    expect(res.missing).toEqual(["fr_elapsed_ms"]);
    expect(res.current.totals.phone_click).toBe(10);
  });

  it("returns empty current and missing=['fr_lead_type'] on INVALID_ARGUMENT for customEvent:fr_lead_type", async () => {
    const err = new Error("3 INVALID_ARGUMENT: Field customEvent:fr_lead_type is unrecognized.");
    const fake = {
      runReport: vi.fn(),
      batchRunReports: vi.fn().mockRejectedValueOnce(err),
    };
    __setGa4ClientForTests(fake as never);
    const res = await getLeadActions("12345", { dateRange: { preset: "last-7d" } });
    expect(fake.batchRunReports).toHaveBeenCalledTimes(1);
    expect(res.missing).toEqual(["fr_lead_type"]);
    expect(res.current.totals).toEqual({});
    expect(res.current.perPage).toEqual([]);
    expect(res.current.avgTimeToAction).toBe(0);
  });

  it("ANDs fr_page_ref inList into the events filter and filters the sessions request when pageFilter has refs", async () => {
    const fake = {
      runReport: vi.fn(),
      batchRunReports: vi.fn().mockResolvedValue([withMetric]),
    };
    __setGa4ClientForTests(fake as never);
    const pageFilter = {
      refs: ["page:1", "__home"],
      pageRefDim: "customEvent:fr_page_ref",
      contentLocaleDim: "customEvent:fr_content_locale",
      resolveLabels: async () => new Map(),
    };
    await getLeadActions("12345", { dateRange: { preset: "last-7d" } }, pageFilter);
    const requests = fake.batchRunReports.mock.calls[0][0].requests;
    const pageRefInList = {
      filter: {
        fieldName: "customEvent:fr_page_ref",
        inListFilter: { values: ["page:1", "__home"] },
      },
    };

    // events request: existing leadActionFilter ANDed with the page-ref inList
    expect(
      requests[0].dimensionFilter.andGroup.expressions[
        requests[0].dimensionFilter.andGroup.expressions.length - 1
      ]
    ).toEqual(pageRefInList);

    // sessions request (denominator): standalone page-ref inList
    expect(requests[1].dimensionFilter).toEqual(pageRefInList);
  });

  it("filters the fallback events request and sessions request when pageFilter set and fr_elapsed_ms missing", async () => {
    const err = new Error(
      "3 INVALID_ARGUMENT: Field averageCustomEvent:fr_elapsed_ms is unrecognized."
    );
    const fake = {
      runReport: vi.fn(),
      batchRunReports: vi.fn().mockRejectedValueOnce(err).mockResolvedValueOnce([withoutMetric]),
    };
    __setGa4ClientForTests(fake as never);
    const pageFilter = {
      refs: ["page:1", "__home"],
      pageRefDim: "customEvent:fr_page_ref",
      contentLocaleDim: "customEvent:fr_content_locale",
      resolveLabels: async () => new Map(),
    };
    await getLeadActions("12345", { dateRange: { preset: "last-7d" } }, pageFilter);
    const retryRequests = fake.batchRunReports.mock.calls[1][0].requests;
    const pageRefInList = {
      filter: {
        fieldName: "customEvent:fr_page_ref",
        inListFilter: { values: ["page:1", "__home"] },
      },
    };
    expect(retryRequests[0].metrics).toEqual([{ name: "eventCount" }]);
    expect(
      retryRequests[0].dimensionFilter.andGroup.expressions[
        retryRequests[0].dimensionFilter.andGroup.expressions.length - 1
      ]
    ).toEqual(pageRefInList);
    expect(retryRequests[1].dimensionFilter).toEqual(pageRefInList);
  });

  it("leaves events filter as leadActionFilter only and sessions unfiltered when pageFilter is null", async () => {
    const fake = {
      runReport: vi.fn(),
      batchRunReports: vi.fn().mockResolvedValue([withMetric]),
    };
    __setGa4ClientForTests(fake as never);
    await getLeadActions("12345", { dateRange: { preset: "last-7d" } }, null);
    const requests = fake.batchRunReports.mock.calls[0][0].requests;
    // events request still carries the lead-action filter, but no page-ref inList anywhere in it
    expect(JSON.stringify(requests[0].dimensionFilter)).not.toContain("fr_page_ref");
    expect(requests[1].dimensionFilter).toBeUndefined();
  });

  it("does NOT retry on unrelated INVALID_ARGUMENT", async () => {
    const err = new Error("3 INVALID_ARGUMENT: bad date format");
    const fake = {
      runReport: vi.fn(),
      batchRunReports: vi.fn().mockRejectedValue(err),
    };
    __setGa4ClientForTests(fake as never);
    await expect(getLeadActions("12345", { dateRange: { preset: "last-7d" } })).rejects.toBe(err);
    expect(fake.batchRunReports).toHaveBeenCalledTimes(1);
  });
});

import { describe, expect, it, vi, afterEach } from "vitest";
import { createScopedGa4Client } from "../../../src/services/ga4DataClient/scopedClient";
import { __resetGa4Client, __setGa4ClientForTests } from "../../../src/services/ga4DataClient";

afterEach(() => __resetGa4Client());

describe("createScopedGa4Client", () => {
  it("prepends 'properties/<propertyId>' when not present", async () => {
    const runReport = vi.fn().mockResolvedValue([{ rows: [] }, null, null]);
    __setGa4ClientForTests({ runReport, batchRunReports: vi.fn() });

    const client = createScopedGa4Client("123");
    await client.runReport({ dateRanges: [{ startDate: "2024-01-01", endDate: "2024-01-31" }] });

    expect(runReport).toHaveBeenCalledWith({
      property: "properties/123",
      dateRanges: [{ startDate: "2024-01-01", endDate: "2024-01-31" }],
    });
  });

  it("does not overwrite an explicit property field", async () => {
    const runReport = vi.fn().mockResolvedValue([{ rows: [] }, null, null]);
    __setGa4ClientForTests({ runReport, batchRunReports: vi.fn() });

    const client = createScopedGa4Client("123");
    await client.runReport({ property: "properties/456", dateRanges: [] });

    expect(runReport).toHaveBeenCalledWith({
      property: "properties/456",
      dateRanges: [],
    });
  });

  it("returns the raw report response (first element of [response, request, undefined])", async () => {
    const expected = { rows: [{ dimensionValues: [{ value: "x" }] }] };
    const runReport = vi.fn().mockResolvedValue([expected, null, null]);
    __setGa4ClientForTests({ runReport, batchRunReports: vi.fn() });

    const client = createScopedGa4Client("123");
    const result = await client.runReport({ dateRanges: [] });
    expect(result).toEqual(expected);
  });
});

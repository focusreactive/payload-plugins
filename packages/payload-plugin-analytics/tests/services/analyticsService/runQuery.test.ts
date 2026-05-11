import { describe, expect, it, vi } from "vitest";
import { runQuery } from "../../../src/services/analyticsService/runQuery";
import { __setGa4ClientForTests } from "../../../src/services/ga4DataClient";

describe("runQuery", () => {
  it("runReport forwards request and prefixes property", async () => {
    const fake = {
      runReport: vi.fn().mockResolvedValue([{ rows: [] }]),
      batchRunReports: vi.fn(),
    };
    __setGa4ClientForTests(fake as never);

    await runQuery.runReport("12345", { dateRanges: [{ startDate: "2026-05-10", endDate: "2026-05-10" }] });
    expect(fake.runReport).toHaveBeenCalledWith(
      expect.objectContaining({
        property: "properties/12345",
        dateRanges: [{ startDate: "2026-05-10", endDate: "2026-05-10" }],
      }),
    );
  });

  it("batchRunReports forwards requests and prefixes property", async () => {
    const fake = {
      runReport: vi.fn(),
      batchRunReports: vi.fn().mockResolvedValue([{ reports: [] }]),
    };
    __setGa4ClientForTests(fake as never);

    await runQuery.batchRunReports("12345", [
      { dateRanges: [{ startDate: "2026-05-10", endDate: "2026-05-10" }] },
    ]);
    expect(fake.batchRunReports).toHaveBeenCalledWith(
      expect.objectContaining({
        property: "properties/12345",
        requests: [{ dateRanges: [{ startDate: "2026-05-10", endDate: "2026-05-10" }] }],
      }),
    );
  });
});

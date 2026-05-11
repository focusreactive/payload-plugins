import { describe, expect, it, vi } from "vitest";
import { getTopDevices } from "../../../src/services/queries/getTopDevices";
import { __setGa4ClientForTests } from "../../../src/services/ga4DataClient";
import topDevices from "../../../__fixtures__/ga4/topDevices.json";

describe("getTopDevices", () => {
  it("requests deviceCategory/browser/operatingSystem dims + sessions/totalUsers metrics", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([topDevices]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await getTopDevices("12345", { dateRange: { preset: "last-7d" } });
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensions).toEqual([
      { name: "deviceCategory" }, { name: "browser" }, { name: "operatingSystem" },
    ]);
    expect(arg.metrics).toEqual([{ name: "sessions" }, { name: "totalUsers" }]);
  });
  it("normalises unknown deviceCategory to 'other'", async () => {
    const fixture = {
      rows: [{ dimensionValues: [{ value: "weird-device" }, { value: "Chrome" }, { value: "Linux" }], metricValues: [{ value: "10" }, { value: "8" }] }],
    };
    const fake = { runReport: vi.fn().mockResolvedValue([fixture]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getTopDevices("12345", { dateRange: { preset: "last-7d" } });
    expect(res.rows[0].deviceCategory).toBe("other");
  });
  it("preserves known deviceCategory values verbatim", async () => {
    const fixture = {
      rows: [
        { dimensionValues: [{ value: "desktop" }, { value: "Chrome" }, { value: "Linux" }], metricValues: [{ value: "10" }, { value: "8" }] },
        { dimensionValues: [{ value: "mobile"  }, { value: "Safari" }, { value: "iOS"   }], metricValues: [{ value: "20" }, { value: "15" }] },
        { dimensionValues: [{ value: "tablet"  }, { value: "Safari" }, { value: "iPadOS"}], metricValues: [{ value: "5"  }, { value: "4"  }] },
      ],
    };
    const fake = { runReport: vi.fn().mockResolvedValue([fixture]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getTopDevices("12345", { dateRange: { preset: "last-7d" } });
    expect(res.rows.map((r) => r.deviceCategory)).toEqual(["desktop", "mobile", "tablet"]);
  });
});

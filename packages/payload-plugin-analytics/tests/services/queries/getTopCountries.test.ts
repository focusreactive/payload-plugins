import { describe, expect, it, vi } from "vitest";
import { getTopCountries } from "../../../src/services/queries/getTopCountries";
import { __setGa4ClientForTests } from "../../../src/services/ga4DataClient";
import topCountries from "../../../__fixtures__/ga4/topCountries.json";

describe("getTopCountries", () => {
  it("requests country/city dims + sessions/totalUsers metrics", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([topCountries]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await getTopCountries("12345", { dateRange: { preset: "last-7d" } });
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensions).toEqual([{ name: "country" }, { name: "city" }]);
    expect(arg.metrics).toEqual([{ name: "sessions" }, { name: "totalUsers" }]);
  });
  it("maps rows to TopCountriesRow with numeric counts", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([topCountries]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getTopCountries("12345", { dateRange: { preset: "last-7d" } });
    expect(res.rows.length).toBeGreaterThan(0);
    expect(typeof res.rows[0].sessions).toBe("number");
  });
});

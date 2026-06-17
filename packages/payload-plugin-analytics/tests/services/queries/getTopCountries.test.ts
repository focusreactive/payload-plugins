import { describe, expect, it, vi } from "vitest";
import { getTopCountries } from "../../../src/services/queries/getTopCountries";
import { __setGa4ClientForTests } from "../../../src/services/ga4DataClient";
import topCountries from "../../../__fixtures__/ga4/topCountries.json";
import topCities from "../../../__fixtures__/ga4/topCities.json";

describe("getTopCountries — country dimension", () => {
  it("requests only the country dimension when dimension is omitted", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([topCountries]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await getTopCountries("12345", { dateRange: { preset: "last-7d" } });
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensions).toEqual([{ name: "country" }]);
  });

  it("requests only the country dimension when dimension='country'", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([topCountries]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await getTopCountries("12345", { dateRange: { preset: "last-7d" }, dimension: "country" });
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensions).toEqual([{ name: "country" }]);
  });

  it("maps rows with empty city in country mode", async () => {
    const fake = {
      runReport: vi.fn().mockResolvedValue([
        {
          dimensionHeaders: [{ name: "country" }],
          metricHeaders: [
            { name: "sessions", type: "TYPE_INTEGER" },
            { name: "totalUsers", type: "TYPE_INTEGER" },
          ],
          rows: [{ dimensionValues: [{ value: "United States" }], metricValues: [{ value: "100" }, { value: "80" }] }],
          rowCount: 1,
        },
      ]),
      batchRunReports: vi.fn(),
    };
    __setGa4ClientForTests(fake as never);
    const res = await getTopCountries("12345", { dateRange: { preset: "last-7d" }, dimension: "country" });
    expect(res.rows[0]).toEqual({ country: "United States", city: "", sessions: 100, users: 80 });
  });
});

describe("getTopCountries — city dimension", () => {
  it("requests [city, country] dimensions when dimension='city'", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([topCities]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await getTopCountries("12345", { dateRange: { preset: "last-7d" }, dimension: "city" });
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensions).toEqual([{ name: "city" }, { name: "country" }]);
  });

  it("maps rows with both city and country populated", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([topCities]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getTopCountries("12345", { dateRange: { preset: "last-7d" }, dimension: "city" });
    expect(res.rows[0]).toEqual({ city: "New York", country: "United States", sessions: 450, users: 380 });
  });
});

describe("getTopCountries — comparison join key", () => {
  it("joins comparison rows by country in country mode", async () => {
    const fake = {
      runReport: vi.fn().mockResolvedValue([
        {
          dimensionHeaders: [{ name: "country" }, { name: "dateRange" }],
          metricHeaders: [
            { name: "sessions", type: "TYPE_INTEGER" },
            { name: "totalUsers", type: "TYPE_INTEGER" },
          ],
          rows: [
            {
              dimensionValues: [{ value: "United States" }, { value: "current" }],
              metricValues: [{ value: "100" }, { value: "80" }],
            },
            {
              dimensionValues: [{ value: "United States" }, { value: "previous" }],
              metricValues: [{ value: "60" }, { value: "50" }],
            },
          ],
          rowCount: 2,
        },
      ]),
      batchRunReports: vi.fn(),
    };
    __setGa4ClientForTests(fake as never);
    const res = await getTopCountries("12345", {
      dateRange: { preset: "last-7d" },
      comparison: { kind: "previous-period" },
      dimension: "country",
    });
    expect(res.rows[0].country).toBe("United States");
    expect(res.comparison?.rows[0]).toMatchObject({ country: "United States", sessions: 60 });
  });

  it("joins comparison rows by city+country in city mode", async () => {
    const fake = {
      runReport: vi.fn().mockResolvedValue([
        {
          dimensionHeaders: [{ name: "city" }, { name: "country" }, { name: "dateRange" }],
          metricHeaders: [
            { name: "sessions", type: "TYPE_INTEGER" },
            { name: "totalUsers", type: "TYPE_INTEGER" },
          ],
          rows: [
            {
              dimensionValues: [{ value: "New York" }, { value: "United States" }, { value: "current" }],
              metricValues: [{ value: "100" }, { value: "80" }],
            },
            {
              dimensionValues: [{ value: "New York" }, { value: "United States" }, { value: "previous" }],
              metricValues: [{ value: "60" }, { value: "50" }],
            },
          ],
          rowCount: 2,
        },
      ]),
      batchRunReports: vi.fn(),
    };
    __setGa4ClientForTests(fake as never);
    const res = await getTopCountries("12345", {
      dateRange: { preset: "last-7d" },
      comparison: { kind: "previous-period" },
      dimension: "city",
    });
    expect(res.rows[0]).toMatchObject({ city: "New York", country: "United States", sessions: 100 });
    expect(res.comparison?.rows[0]).toMatchObject({ city: "New York", country: "United States", sessions: 60 });
  });
});

describe("getTopCountries — page filter", () => {
  it("applies fr_page_ref inList filter when pageFilter has refs", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([topCountries]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await getTopCountries(
      "12345",
      { dateRange: { preset: "last-7d" } },
      { refs: ["page:1", "__home"], pageRefDim: "customEvent:fr_page_ref", contentLocaleDim: "customEvent:fr_content_locale", resolveLabels: async () => new Map() }
    );
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensionFilter).toEqual({ filter: { fieldName: "customEvent:fr_page_ref", inListFilter: { values: ["page:1", "__home"] } } });
  });
  it("adds no fr_page_ref filter when pageFilter is null", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([topCountries]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await getTopCountries("12345", { dateRange: { preset: "last-7d" } }, null);
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensionFilter).toBeUndefined();
  });
});

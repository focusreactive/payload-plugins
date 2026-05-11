import { describe, expect, it, vi } from "vitest";
import { getSessionDetail } from "../../../src/services/queries/getSessionDetail";
import { __setGa4ClientForTests } from "../../../src/services/ga4DataClient";
import { encodeSessionId } from "../../../src/utils/ga4";
import sessionDetail from "../../../__fixtures__/ga4/sessionDetail.json";

const SIGNATURE = { dhm: "202605101430", src: "google", dev: "desktop", ctr: "United States", lp: "/" };
const SESSION_ID = encodeSessionId(SIGNATURE);

describe("getSessionDetail", () => {
  it("decodes synthetic sessionId and filters with andGroup on the 5 signature dims", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([sessionDetail]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await getSessionDetail("12345", SESSION_ID, { dateRange: { preset: "last-7d" } });
    const arg = fake.runReport.mock.calls[0][0];
    expect(arg.dimensionFilter).toEqual({
      andGroup: {
        expressions: [
          { filter: { fieldName: "dateHourMinute", stringFilter: { value: "202605101430" } } },
          { filter: { fieldName: "sessionSource", stringFilter: { value: "google" } } },
          { filter: { fieldName: "deviceCategory", stringFilter: { value: "desktop" } } },
          { filter: { fieldName: "country", stringFilter: { value: "United States" } } },
          { filter: { fieldName: "landingPagePlusQueryString", stringFilter: { value: "/" } } },
        ],
      },
    });
    expect(arg.orderBys).toEqual([{ dimension: { dimensionName: "dateHourMinute" } }]);
    expect(arg.dimensions).toEqual([{ name: "eventName" }, { name: "pagePath" }, { name: "dateHourMinute" }]);
  });

  it("throws INVALID_SESSION_ID for a malformed sessionId", async () => {
    const fake = { runReport: vi.fn(), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    await expect(
      getSessionDetail("12345", "not-a-valid-id", { dateRange: { preset: "last-7d" } }),
    ).rejects.toMatchObject({ code: "INVALID_SESSION_ID" });
    expect(fake.runReport).not.toHaveBeenCalled();
  });

  it("converts dateHourMinute → ISO minute precision", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([sessionDetail]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getSessionDetail("12345", SESSION_ID, { dateRange: { preset: "last-7d" } });
    expect(res.events.every((e) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/.test(e.timestamp))).toBe(true);
  });

  it("params is empty in MVP", async () => {
    const fake = { runReport: vi.fn().mockResolvedValue([sessionDetail]), batchRunReports: vi.fn() };
    __setGa4ClientForTests(fake as never);
    const res = await getSessionDetail("12345", SESSION_ID, { dateRange: { preset: "last-7d" } });
    expect(res.events[0].params).toEqual({});
  });
});

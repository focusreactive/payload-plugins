import { describe, expect, it } from "vitest";
import { leadActionsMock } from "../../../../src/services/analyticsService/mocks/leadActions";
import leadActionsBatch from "../../../../__fixtures__/ga4/leadActions.batch.json";

describe("leadActionsMock", () => {
  it("returns the canonical batch fixture", async () => {
    const result = await leadActionsMock([{ dateRanges: [{ startDate: "2026-05-04", endDate: "2026-05-06" }] }, { dateRanges: [{ startDate: "2026-05-04", endDate: "2026-05-06" }] }]);
    expect(result).toEqual(leadActionsBatch);
  });

  it("has two reports in the batch (events + sessions)", async () => {
    const result = await leadActionsMock([{ dateRanges: [{ startDate: "2026-05-04", endDate: "2026-05-06" }] }, { dateRanges: [{ startDate: "2026-05-04", endDate: "2026-05-06" }] }]);
    expect(result.reports).toHaveLength(2);
  });
});

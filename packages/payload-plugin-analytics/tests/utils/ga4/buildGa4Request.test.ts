import { describe, expect, it } from "vitest";
import { dateRangesFor, withRowLimit, withInListFilter } from "../../../src/utils/ga4";

describe("dateRangesFor", () => {
  it("returns single named range when no comparison", () => {
    const current = { startDate: "2026-05-04", endDate: "2026-05-10" };
    expect(dateRangesFor(current)).toEqual([{ ...current, name: "current" }]);
  });
  it("returns two named ranges when comparison provided", () => {
    const current = { startDate: "2026-05-04", endDate: "2026-05-10" };
    const previous = { startDate: "2026-04-27", endDate: "2026-05-03" };
    expect(dateRangesFor(current, previous)).toEqual([
      { ...current, name: "current" },
      { ...previous, name: "previous" },
    ]);
  });
});

describe("withRowLimit", () => {
  it("clamps to [1, 250000]", () => {
    expect(withRowLimit({}, 10).limit).toBe(10);
    expect(withRowLimit({}, 0).limit).toBe(1);
    expect(withRowLimit({}, 999_999).limit).toBe(250_000);
  });
  it("defaults to 10 when limit undefined", () => {
    expect(withRowLimit({}, undefined).limit).toBe(10);
  });
});

describe("withInListFilter", () => {
  it("produces a dimensionFilter with inListFilter shape", () => {
    const r = withInListFilter({}, "eventName", ["phone_click", "email_click"]);
    expect(r.dimensionFilter).toEqual({
      filter: {
        fieldName: "eventName",
        inListFilter: { values: ["phone_click", "email_click"] },
      },
    });
  });
});

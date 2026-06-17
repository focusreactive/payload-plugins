// tests/services/analyticsService/mocks/filterAndReaggregate.test.ts
import { describe, expect, it } from "vitest";
import { filterAndReaggregate } from "../../../../src/services/analyticsService/mocks/filterAndReaggregate";
import { row } from "../../../../src/services/analyticsService/mocks/ga4RowBuilder";

// Internal ref-tagged rows: dims = [source, ref], metrics = [sessions, users].
// refIndex = 1, keepDimIndices = [0].
const ROWS = [
  row(["google", "pages:1"], ["100", "80"]),
  row(["google", "pages:__mock_deleted__"], ["999", "999"]), // missing → dropped
  row(["direct", "pages:1"], ["50", "40"]),
];

describe("filterAndReaggregate", () => {
  it("drops rows whose ref is not allowed and re-aggregates by kept dims (ref stripped)", () => {
    const out = filterAndReaggregate(ROWS, { refIndex: 1, keepDimIndices: [0], allowed: new Set(["pages:1", "__home"]) });
    // google = 100/80 (missing 999/999 dropped), direct = 50/40
    expect(out).toEqual([
      { dimensionValues: [{ value: "google" }], metricValues: [{ value: "100" }, { value: "80" }] },
      { dimensionValues: [{ value: "direct" }], metricValues: [{ value: "50" }, { value: "40" }] },
    ]);
  });

  it("sums metrics across rows that collapse to the same kept-dim tuple", () => {
    const rows = [row(["google", "pages:1"], ["100", "80"]), row(["google", "pages:2"], ["10", "5"])];
    const out = filterAndReaggregate(rows, { refIndex: 1, keepDimIndices: [0], allowed: new Set(["pages:1", "pages:2"]) });
    expect(out).toEqual([{ dimensionValues: [{ value: "google" }], metricValues: [{ value: "110" }, { value: "85" }] }]);
  });

  it("when allowed is null (no filter), keeps all rows but still strips the ref dim + re-aggregates", () => {
    const out = filterAndReaggregate(ROWS, { refIndex: 1, keepDimIndices: [0], allowed: null });
    expect(out).toEqual([
      { dimensionValues: [{ value: "google" }], metricValues: [{ value: "1099" }, { value: "1079" }] },
      { dimensionValues: [{ value: "direct" }], metricValues: [{ value: "50" }, { value: "40" }] },
    ]);
  });

  it("collapses all allowed rows into a single grand-total row when keepDimIndices is empty", () => {
    expect(filterAndReaggregate(ROWS, { refIndex: 1, keepDimIndices: [], allowed: new Set(["pages:1"]) })).toEqual([{ dimensionValues: [], metricValues: [{ value: "150" }, { value: "120" }] }]);
  });
});

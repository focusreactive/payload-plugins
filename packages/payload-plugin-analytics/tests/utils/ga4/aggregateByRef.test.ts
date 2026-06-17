// tests/utils/ga4/aggregateByRef.test.ts
import { describe, expect, it } from "vitest";
import { aggregateByRef } from "../../../src/utils/ga4/aggregateByRef";
import type { Row } from "../../../src/types/query";

const rows: Row[] = [
  { dimensionValues: [{ value: "pages:1" }], metricValues: [{ value: "100" }, { value: "10" }] },
  { dimensionValues: [{ value: "pages:1" }], metricValues: [{ value: "50" }, { value: "5" }] },
  { dimensionValues: [{ value: "pages:2" }], metricValues: [{ value: "20" }, { value: "2" }] },
];

describe("aggregateByRef", () => {
  it("sums each metric per ref at the given dim index", () => {
    expect(aggregateByRef(rows, 0, 2)).toEqual(
      new Map([
        ["pages:1", [150, 15]],
        ["pages:2", [20, 2]],
      ])
    );
  });

  it("ignores rows with an empty ref", () => {
    expect(aggregateByRef([{ dimensionValues: [{ value: "" }], metricValues: [{ value: "9" }] }], 0, 1)).toEqual(new Map());
  });
});

import { describe, expect, it } from "vitest";

import {
  filterOptions,
  isAllSelected,
  orderedSelection,
  selectAllValue,
  summarizeSelection,
  toggleValue,
} from "./multiSelectModel";

const options = [
  { value: "en", label: "en" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "fr" },
  { value: "es", label: "es" },
];

describe("orderedSelection", () => {
  it("returns selected values in option order, not click order", () => {
    expect(orderedSelection(["fr", "de"], options)).toEqual(["de", "fr"]);
  });

  it("ignores values that are not configured options (stale selection)", () => {
    expect(orderedSelection(["de", "xx"], options)).toEqual(["de"]);
  });

  it("returns [] for an empty selection", () => {
    expect(orderedSelection([], options)).toEqual([]);
  });
});

describe("isAllSelected", () => {
  it("is true only when every option is selected", () => {
    expect(isAllSelected(["en", "de", "fr", "es"], options)).toBe(true);
    expect(isAllSelected(["en", "de", "fr"], options)).toBe(false);
  });

  it("ignores order and extra stale values", () => {
    expect(isAllSelected(["es", "fr", "de", "en", "xx"], options)).toBe(true);
  });

  it("is false when there are no options", () => {
    expect(isAllSelected([], [])).toBe(false);
  });
});

describe("toggleValue", () => {
  it("adds an unselected value (appended)", () => {
    expect(toggleValue(["de"], "fr")).toEqual(["de", "fr"]);
  });

  it("removes an already-selected value, preserving the rest", () => {
    expect(toggleValue(["de", "fr", "es"], "fr")).toEqual(["de", "es"]);
  });
});

describe("selectAllValue", () => {
  it("selects every option when not all are selected", () => {
    expect(selectAllValue(["de"], options)).toEqual(["en", "de", "fr", "es"]);
  });

  it("clears the selection when all are already selected", () => {
    expect(selectAllValue(["en", "de", "fr", "es"], options)).toEqual([]);
  });
});

describe("summarizeSelection", () => {
  it("shows the placeholder when nothing is selected", () => {
    expect(summarizeSelection([], options, "-")).toBe("-");
  });

  it("shows a single code as-is", () => {
    expect(summarizeSelection(["de"], options, "-")).toBe("de");
  });

  it("shows two codes without overflow", () => {
    expect(summarizeSelection(["de", "fr"], options, "-")).toBe("de, fr");
  });

  it("shows up to two codes + a +N overflow, in option order", () => {
    expect(summarizeSelection(["fr", "de", "es"], options, "-")).toBe("de, fr +1");
  });

  it("shows All (N) when every option is selected", () => {
    expect(summarizeSelection(["en", "de", "fr", "es"], options, "-")).toBe("All (4)");
  });

  it("ignores stale values in the count (does not falsely read as All)", () => {
    // 4 raw values but one is stale → only 3 real → not "All", shown as codes + overflow.
    expect(summarizeSelection(["en", "de", "fr", "xx"], options, "-")).toBe("en, de +1");
  });
});

describe("filterOptions", () => {
  it("returns all options for a blank query", () => {
    expect(filterOptions(options, "   ")).toHaveLength(4);
  });

  it("matches on value (case-insensitive)", () => {
    expect(filterOptions(options, "FR").map((o) => o.value)).toEqual(["fr"]);
  });

  it("matches on label too", () => {
    expect(filterOptions(options, "deutsch").map((o) => o.value)).toEqual(["de"]);
  });

  it("returns [] when nothing matches", () => {
    expect(filterOptions(options, "zz")).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";

import {
  fieldDomIdOf,
  fieldPathFromDomId,
  isRowPathPrefix,
  rowContainerIdOf,
  rowIndexFromContainerId,
  rowPathFromIds,
} from "../src/lib/domPath.js";

describe("Payload DOM ids", () => {
  it("round-trips field wrapper ids", () => {
    expect(fieldDomIdOf("layout.0.items")).toBe("field-layout__0__items");
    expect(fieldPathFromDomId("field-layout__0__items")).toBe("layout.0.items");
    expect(fieldPathFromDomId("field-")).toBeNull();
    expect(fieldPathFromDomId("layout")).toBeNull();
  });

  it("builds and parses row container ids", () => {
    expect(rowContainerIdOf("layout.0.items", 2)).toBe("layout-0-items-row-2");
    expect(rowIndexFromContainerId("layout-0-items-row-12")).toBe(12);
    expect(rowIndexFromContainerId("layout-0-items")).toBeNull();
  });

  it("takes the field path from the wrapper, the index from the row", () => {
    expect(
      rowPathFromIds({
        fieldWrapperId: "field-layout__0__items",
        rowContainerId: "layout-0-items-row-2",
      })
    ).toBe("layout.0.items.2");
  });

  it("keeps dashes in field names that the row id alone would make ambiguous", () => {
    expect(
      rowPathFromIds({ fieldWrapperId: "field-my-items", rowContainerId: "my-items-row-0" })
    ).toBe("my-items.0");
    expect(
      rowPathFromIds({ fieldWrapperId: "field-my__items", rowContainerId: "my-items-row-0" })
    ).toBe("my.items.0");
  });

  it("refuses ids that do not describe the same row", () => {
    expect(
      rowPathFromIds({ fieldWrapperId: "field-layout", rowContainerId: "layout-0-items-row-2" })
    ).toBeNull();
    expect(rowPathFromIds({ fieldWrapperId: "nope", rowContainerId: "layout-row-0" })).toBeNull();
  });

  it("tells row paths below a row", () => {
    expect(isRowPathPrefix("layout.0", "layout.0.items.1")).toBe(true);
    expect(isRowPathPrefix("layout.0", "layout.0")).toBe(true);
    expect(isRowPathPrefix("layout.1", "layout.10")).toBe(false);
  });
});

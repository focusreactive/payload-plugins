import { describe, expect, it } from "vitest";

import { parseFieldPath } from "../src/admin/parseFieldPath";

describe("parseFieldPath", () => {
  it("maps leaf paths to field id", () => {
    expect(parseFieldPath("layout.0.richText")).toEqual({
      rowIds: ["layout-row-0"],
      fieldId: "field-layout__0__richText",
    });
  });

  it("handles multi-level arrays", () => {
    expect(parseFieldPath("layout.0.links.1.link.url")).toEqual({
      rowIds: ["layout-row-0", "layout-0-links-row-1"],
      fieldId: "field-layout__0__links__1__link__url",
    });
  });

  it("returns null fieldId when path ends with a row index", () => {
    expect(parseFieldPath("layout.0")).toEqual({
      rowIds: ["layout-row-0"],
      fieldId: null,
    });
  });

  it("handles a plain top-level field", () => {
    expect(parseFieldPath("title")).toEqual({
      rowIds: [],
      fieldId: "field-title",
    });
  });
});

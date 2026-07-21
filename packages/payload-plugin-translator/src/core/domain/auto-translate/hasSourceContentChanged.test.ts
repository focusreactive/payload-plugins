import { describe, it, expect } from "vitest";

import type { FieldLike } from "../../kernel/field-traversal";

import { hasSourceContentChanged } from "./hasSourceContentChanged";

describe("hasSourceContentChanged", () => {
  const schema: FieldLike[] = [{ name: "title", type: "text", localized: true }];

  it("true when translatable content changed", () => {
    expect(hasSourceContentChanged({ title: "A" }, { title: "B" }, schema)).toBe(true);
  });

  it("false when only non-translatable fields changed", () => {
    expect(
      hasSourceContentChanged({ title: "A", views: 1 }, { title: "A", views: 2 }, schema)
    ).toBe(false);
  });

  it("true on create (no previousDoc)", () => {
    expect(hasSourceContentChanged(undefined, { title: "A" }, schema)).toBe(true);
    expect(hasSourceContentChanged(null, { title: "A" }, schema)).toBe(true);
  });
});

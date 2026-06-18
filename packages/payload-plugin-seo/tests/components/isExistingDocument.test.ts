import { describe, expect, it } from "vitest";
import { isExistingDocument } from "../../src/components/SeoButton/isExistingDocument";

describe("isExistingDocument", () => {
  it("treats a missing id (create view) as not existing", () => {
    expect(isExistingDocument(undefined)).toBe(false);
    expect(isExistingDocument(null)).toBe(false);
  });

  it("treats a blank string id as not existing", () => {
    expect(isExistingDocument("")).toBe(false);
    expect(isExistingDocument("   ")).toBe(false);
  });

  it("treats a real string id as existing", () => {
    expect(isExistingDocument("65f0a1b2c3d4e5f6a7b8c9d0")).toBe(true);
  });

  it("treats a numeric id as existing", () => {
    expect(isExistingDocument(42)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { formatPageRef } from "../../../src/utils/page/formatPageRef";

describe("formatPageRef", () => {
  it("joins collection + numeric id", () => {
    expect(formatPageRef("page", 42)).toBe("page:42");
  });

  it("joins collection + string id (uuid future-proof)", () => {
    expect(formatPageRef("posts", "abc-1")).toBe("posts:abc-1");
  });
});

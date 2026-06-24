import { describe, expect, it } from "vitest";
import { refKey } from "../../../src/content/resolve/types";

describe("refKey", () => {
  it("joins collection and id", () => {
    expect(refKey({ collection: "media", id: 4 })).toBe("media:4");
    expect(refKey({ collection: "posts", id: "abc" })).toBe("posts:abc");
  });
});

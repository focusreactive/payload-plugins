import { describe, expect, it } from "vitest";
import { isContentNode } from "../../../src/content/schema/nodes";

describe("isContentNode", () => {
  it("accepts a valid node", () => {
    expect(isContentNode({ type: "heading", level: 2, text: "Hi" })).toBe(true);
  });
  it("rejects non-nodes", () => {
    expect(isContentNode(null)).toBe(false);
    expect(isContentNode({ foo: 1 })).toBe(false);
  });
});

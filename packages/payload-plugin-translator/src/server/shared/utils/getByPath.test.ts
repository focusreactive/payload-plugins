import { describe, it, expect } from "vitest";

import { getByPath } from "./getByPath";

describe("getByPath", () => {
  it("gets top-level property", () => {
    expect(getByPath({ title: "Hello" }, "title")).toBe("Hello");
  });

  it("gets nested property", () => {
    expect(getByPath({ a: { b: { c: 1 } } }, "a.b.c")).toBe(1);
  });

  it("gets array element", () => {
    expect(getByPath({ arr: ["a", "b", "c"] }, "arr.1")).toBe("b");
  });

  it("gets nested property in array", () => {
    expect(
      getByPath(
        { items: [{ name: "first" }, { name: "second" }] },
        "items.1.name"
      )
    ).toBe("second");
  });

  it("returns undefined for missing path", () => {
    expect(getByPath({ a: 1 }, "b")).toBeUndefined();
    expect(getByPath({ a: 1 }, "a.b")).toBeUndefined();
  });

  it("returns undefined for null in path", () => {
    expect(getByPath({ a: null }, "a.b")).toBeUndefined();
  });

  it("handles complex nested structure", () => {
    const obj = {
      body: [
        { blockType: "text", content: { root: { children: [] } } },
        { blockType: "image", url: "test.jpg" },
      ],
    };
    expect(getByPath(obj, "body.0.content.root.children")).toEqual([]);
    expect(getByPath(obj, "body.1.url")).toBe("test.jpg");
  });
});

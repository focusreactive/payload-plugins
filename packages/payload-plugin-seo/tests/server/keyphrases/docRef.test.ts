import { describe, expect, it } from "vitest";
import { readDocTarget } from "../../../src/server/keyphrases/docRef";

const allowed = ["page", "posts"];

describe("readDocTarget", () => {
  it("reads a valid reference", () => {
    expect(readDocTarget({ collection: "page", docId: "12" }, allowed)).toEqual({
      collection: "page",
      docId: "12",
    });
  });

  it("accepts a numeric docId", () => {
    expect(readDocTarget({ collection: "page", docId: 12 }, allowed)?.docId).toBe("12");
  });

  it("ignores any locale in the source", () => {
    expect(readDocTarget({ collection: "page", docId: "12", locale: "fr" }, allowed)).toEqual({
      collection: "page",
      docId: "12",
    });
  });

  it("rejects missing fields, blank values and unknown collections", () => {
    expect(readDocTarget(undefined, allowed)).toBeNull();
    expect(readDocTarget({ collection: "page" }, allowed)).toBeNull();
    expect(readDocTarget({ collection: "page", docId: " " }, allowed)).toBeNull();
    expect(readDocTarget({ collection: "users", docId: "1" }, allowed)).toBeNull();
  });
});

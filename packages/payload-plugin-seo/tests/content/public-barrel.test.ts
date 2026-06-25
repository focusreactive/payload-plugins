import { describe, expect, it } from "vitest";
import * as content from "../../src/content";

describe("content public barrel", () => {
  it("exposes the helpers", () => {
    for (const name of [
      "heading",
      "paragraph",
      "link",
      "image",
      "video",
      "richText",
      "html",
      "compact",
    ]) {
      expect(typeof (content as Record<string, unknown>)[name]).toBe("function");
    }
  });
  it("does NOT export serialize", () => {
    expect((content as Record<string, unknown>).serialize).toBeUndefined();
  });
});

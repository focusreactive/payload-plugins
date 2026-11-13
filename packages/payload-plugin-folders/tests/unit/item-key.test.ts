import { describe, expect, it } from "vitest";

import { itemKey } from "../../src/core/itemKey.js";

describe("itemKey", () => {
  it("joins the collection and the id", () => {
    expect(itemKey({ collection: "pages", id: 3 })).toBe("pages:3");
    expect(itemKey({ collection: "folders", id: "abc" })).toBe("folders:abc");
  });

  it("tells a page and a folder with the same id apart", () => {
    expect(itemKey({ collection: "pages", id: 1 })).not.toBe(
      itemKey({ collection: "folders", id: 1 })
    );
  });
});

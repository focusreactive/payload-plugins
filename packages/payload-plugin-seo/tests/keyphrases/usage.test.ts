import { describe, expect, it } from "vitest";
import { adminDocHref, hasDocIdentity } from "../../src/keyphrases/usage";

describe("adminDocHref", () => {
  it("links to the document edit view under the admin route", () => {
    expect(adminDocHref("/admin", { collection: "posts", id: "7" })).toBe(
      "/admin/collections/posts/7"
    );
  });

  it("supports a custom admin route", () => {
    expect(adminDocHref("/cms", { collection: "pages", id: "1" })).toBe("/cms/collections/pages/1");
  });

  it("does not double the slash when the admin is served from the root", () => {
    expect(adminDocHref("/", { collection: "pages", id: "1" })).toBe("/collections/pages/1");
  });
});

describe("hasDocIdentity", () => {
  it("accepts a document with string collection, id and title", () => {
    expect(hasDocIdentity({ collection: "posts", id: "1", title: "A" })).toBe(true);
  });

  it.each([
    null,
    "posts",
    { collection: "posts", id: 1, title: "A" },
    { collection: "posts", id: "1" },
  ])("rejects %j", (value) => {
    expect(hasDocIdentity(value)).toBe(false);
  });
});

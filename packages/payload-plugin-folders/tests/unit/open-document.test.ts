import { describe, expect, it } from "vitest";

import { openDocumentOf } from "../../src/admin/SidebarTab/openDocument.js";

const collections = ["pages", "posts", "folders"];
const adminRoute = "/admin";

const read = (
  pathname: string | null,
  params: Record<string, string | string[] | undefined> | null = null
) => openDocumentOf({ adminRoute, collections, params, pathname });

describe("the document open in the edit view", () => {
  it("reads it from the route params of the admin's catch-all", () => {
    expect(
      read("/admin/collections/pages/12", { segments: ["collections", "pages", "12"] })
    ).toEqual({ collection: "pages", id: 12 });
  });

  it("reads it from the path when the router gave no params", () => {
    expect(read("/admin/collections/posts/7")).toEqual({ collection: "posts", id: 7 });
    expect(read("/admin/collections/posts/7/versions")).toEqual({ collection: "posts", id: 7 });
  });

  it("keeps a text id as text and a number-looking id as a number", () => {
    expect(read("/admin/collections/pages/abc-12")).toEqual({ collection: "pages", id: "abc-12" });
    expect(read("/admin/collections/pages/0012")).toEqual({ collection: "pages", id: "0012" });
  });

  it("names a folder as open on its own edit view", () => {
    expect(read("/admin/collections/folders/5")).toEqual({ collection: "folders", id: 5 });
  });

  it("follows the host's admin route", () => {
    expect(
      openDocumentOf({
        adminRoute: "/cms",
        collections,
        params: null,
        pathname: "/cms/collections/pages/3",
      })
    ).toEqual({ collection: "pages", id: 3 });
    expect(read("/cms/collections/pages/3")).toBeNull();
  });

  it("says nothing for a list, a create view, the trash or another collection", () => {
    expect(read("/admin/collections/pages")).toBeNull();
    expect(read("/admin/collections/pages/create")).toBeNull();
    expect(read("/admin/collections/pages/trash")).toBeNull();
    expect(read("/admin/collections/users/2")).toBeNull();
    expect(read("/admin/globals/header")).toBeNull();
    expect(read("/admin")).toBeNull();
    expect(read(null)).toBeNull();
  });

  it("refuses an id that could not be one", () => {
    expect(read("/admin/collections/pages/a%20b")).toBeNull();
    expect(read("/admin/collections/pages/a.b")).toBeNull();
  });
});

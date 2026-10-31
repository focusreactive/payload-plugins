import { describe, expect, it } from "vitest";

import { buildContextMenu } from "../../src/admin/ContextMenu/menuItems.js";
import type { ContextMenuContext } from "../../src/admin/ContextMenu/menuItems.js";
import { buildCreateMenu, createPageEntryPrefix } from "../../src/admin/Create/createMenu.js";
import { pageTypeOptionsOf } from "../../src/admin/Create/pageTypes.js";
import { folderRow, pageRow } from "../helpers/treeItems.js";

const typeLabels = { pages: "Page", posts: "Blog post", products: "Product" };

describe("pageTypeOptionsOf", () => {
  it("offers every page type, in the host's order, where the folder restricts none", () => {
    expect(pageTypeOptionsOf(folderRow(1, "Blog"), typeLabels)).toEqual([
      { collection: "pages", isDefault: false, label: "Page" },
      { collection: "posts", isDefault: false, label: "Blog post" },
      { collection: "products", isDefault: false, label: "Product" },
    ]);
  });

  it("offers every page type at the top level, which has no default", () => {
    expect(pageTypeOptionsOf(null, typeLabels).map((type) => type.collection)).toEqual([
      "pages",
      "posts",
      "products",
    ]);
  });

  it("offers only the allowed types, and lists the default first", () => {
    const folder = folderRow(1, "2026", 5, {
      allowedTypes: ["posts", "products"],
      defaultType: "products",
    });

    expect(pageTypeOptionsOf(folder, typeLabels)).toEqual([
      { collection: "products", isDefault: true, label: "Product" },
      { collection: "posts", isDefault: false, label: "Blog post" },
    ]);
  });

  it("puts the default first among all types when the folder restricts none", () => {
    const folder = folderRow(1, "Blog", null, { defaultType: "posts" });

    expect(pageTypeOptionsOf(folder, typeLabels).map((type) => type.collection)).toEqual([
      "posts",
      "pages",
      "products",
    ]);
  });

  it("ignores a default the folder does not allow, and a type the site no longer has", () => {
    const folder = folderRow(1, "2026", 5, {
      allowedTypes: ["posts", "removed"],
      defaultType: "pages",
    });

    expect(pageTypeOptionsOf(folder, typeLabels)).toEqual([
      { collection: "posts", isDefault: false, label: "Blog post" },
    ]);
  });
});

describe("buildCreateMenu", () => {
  it("lists Folder, then a group of the page types with the default marked", () => {
    const groups = buildCreateMenu(
      pageTypeOptionsOf(folderRow(1, "Blog", null, { defaultType: "posts" }), typeLabels)
    );

    expect(groups).toHaveLength(2);
    expect(groups[0]?.map((entry) => entry.id)).toEqual(["createFolder"]);
    expect(groups[1]?.map((entry) => entry.id)).toEqual([
      `${createPageEntryPrefix}posts`,
      `${createPageEntryPrefix}pages`,
      `${createPageEntryPrefix}products`,
    ]);
    expect(groups[1]?.map((entry) => entry.badgeKey)).toEqual([
      "createDefaultBadge",
      undefined,
      undefined,
    ]);
  });

  it("offers only Folder when no page type is allowed", () => {
    expect(buildCreateMenu([])).toHaveLength(1);
  });
});

describe("the context menu's create entries", () => {
  const contextFor = (item: ContextMenuContext["item"]): ContextMenuContext => ({
    hasMoreSiblings: false,
    hasPreviewUrl: false,
    isBusy: false,
    item,
    pageTypes: item.kind === "folder" ? pageTypeOptionsOf(item, typeLabels) : [],
    rootPage: null,
    siblings: [item],
    targets: [item],
  });
  const createGroupOf = (item: ContextMenuContext["item"]) =>
    buildContextMenu(contextFor(item)).find((group) =>
      group.some((entry) => entry.id === "createPage" || entry.id === "createFolder")
    );

  it("gives a folder Create page here with its types and Create folder here", () => {
    const folder = folderRow(1, "2026", 5, { allowedTypes: ["posts"], defaultType: "posts" });
    const group = createGroupOf(folder);

    expect(group?.map((entry) => entry.id)).toEqual(["createPage", "createFolder"]);
    expect(group?.[0]?.children?.map((entry) => entry.label)).toEqual([{ text: "Blog post" }]);
    expect(group?.[0]?.children?.[0]?.badgeKey).toBe("createDefaultBadge");
  });

  it("gives a page neither", () => {
    expect(createGroupOf(pageRow(2, "Contact", 5))).toBeUndefined();
  });

  it("keeps both for a folder the role cannot change, off, with the reason", () => {
    const folder = folderRow(1, "Locked", null, {
      access: { delete: false, publish: false, update: false },
    });
    const group = createGroupOf(folder);

    expect(group?.map((entry) => entry.reason)).toEqual([
      { key: "menuNoAccess" },
      { key: "menuNoAccess" },
    ]);
  });
});

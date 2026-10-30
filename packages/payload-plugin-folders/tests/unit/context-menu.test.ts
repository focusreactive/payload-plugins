import { describe, expect, it } from "vitest";

import { buildContextMenu } from "../../src/admin/ContextMenu/menuItems.js";
import type {
  ContextMenuContext,
  ContextMenuDefinition,
} from "../../src/admin/ContextMenu/menuItems.js";
import type { MenuEntry } from "../../src/admin/Menu/menuEntries.js";
import { folderRow, pageRow } from "../helpers/treeItems.js";

const idsOf = (context: ContextMenuContext, definitions?: readonly ContextMenuDefinition[]) =>
  buildContextMenu(context, definitions).map((group) => group.map((entry) => entry.id));

const entryOf = (context: ContextMenuContext, id: string): MenuEntry | undefined =>
  buildContextMenu(context)
    .flat()
    .find((entry) => entry.id === id);

const contextFor = (
  item: ContextMenuContext["item"],
  overrides: Partial<ContextMenuContext> = {}
): ContextMenuContext => ({
  hasMoreSiblings: false,
  hasPreviewUrl: false,
  isBusy: false,
  item,
  rootPage: null,
  siblings: [pageRow(1, "Before", 5), item, pageRow(3, "After", 5)],
  targets: [item],
  ...overrides,
});

describe("buildContextMenu, which entries a row gets", () => {
  it("gives a page Open, Open in new tab, Set as root page, the moves and Copy URL", () => {
    expect(idsOf(contextFor(pageRow(2, "Contact", 5)))).toEqual([
      ["open", "openInNewTab"],
      ["setAsRoot", "moveTo", "moveUp", "moveDown"],
      ["copyUrl"],
    ]);
  });

  it("gives a folder no Open in new tab and no Set as root page", () => {
    expect(idsOf(contextFor(folderRow(2, "News", 5)))).toEqual([
      ["open"],
      ["moveTo", "moveUp", "moveDown"],
      ["copyUrl"],
    ]);
  });

  it("offers View page only when the host set a preview URL, and only for pages", () => {
    const page = pageRow(2, "Contact", 5);

    expect(idsOf(contextFor(page))).not.toContainEqual(expect.arrayContaining(["viewPage"]));
    expect(idsOf(contextFor(page, { hasPreviewUrl: true }))[2]).toEqual(["copyUrl", "viewPage"]);
    expect(idsOf(contextFor(folderRow(2, "News", 5), { hasPreviewUrl: true }))[2]).toEqual([
      "copyUrl",
    ]);
  });

  it("leaves Set as root page out for a page that already is the root", () => {
    const root = pageRow(2, "About Us", 5, { isFolderRoot: true });

    expect(idsOf(contextFor(root)).flat()).not.toContain("setAsRoot");
  });

  it("builds from the definitions it is given, so a later ticket adds its entry in one place", () => {
    const definitions: ContextMenuDefinition[] = [
      {
        build: () => ({ id: "delete", label: { text: "Delete" }, reason: null }),
        group: "share",
        id: "delete",
      },
    ];

    expect(idsOf(contextFor(pageRow(2, "Contact", 5)), definitions)).toEqual([["delete"]]);
  });
});

describe("buildContextMenu, entries a row refuses stay with a reason", () => {
  const readOnly = { delete: false, publish: false, update: false };

  it("disables Set as root page and every move without update access, and keeps Open and Copy URL", () => {
    const page = pageRow(2, "Contact", 5, { access: readOnly });
    const context = contextFor(page);

    for (const id of ["setAsRoot", "moveTo", "moveUp", "moveDown"]) {
      expect(entryOf(context, id)?.reason).toEqual({ key: "menuNoAccess" });
    }
    expect(entryOf(context, "open")?.reason).toBeNull();
    expect(entryOf(context, "copyUrl")?.reason).toBeNull();
  });

  it("needs publish access to make a published page the root, but not a draft", () => {
    const drafterAccess = { delete: true, publish: false, update: true };
    const published = pageRow(2, "Contact", 5, { access: drafterAccess, status: "published" });
    const draft = pageRow(2, "Contact", 5, { access: drafterAccess, status: "draft" });

    expect(entryOf(contextFor(published), "setAsRoot")?.reason).toEqual({ key: "menuNoAccess" });
    expect(entryOf(contextFor(draft), "setAsRoot")?.reason).toBeNull();
  });

  it("names the page that is already the folder's root", () => {
    const page = pageRow(2, "Contact", 5);

    expect(
      entryOf(contextFor(page, { rootPage: { title: "About Us" } }), "setAsRoot")?.reason
    ).toEqual({
      key: "menuRootTaken",
      variables: { title: "About Us" },
    });
    expect(entryOf(contextFor(page, { rootPage: "unknown" }), "setAsRoot")?.reason).toEqual({
      key: "menuRootTakenUnknown",
    });
  });

  it("turns the moves off while another move is under way, and nothing else", () => {
    const context = contextFor(pageRow(2, "Contact", 5), { isBusy: true });

    for (const id of ["moveTo", "moveUp", "moveDown"]) {
      expect(entryOf(context, id)?.reason).toEqual({ key: "menuBusy" });
    }
    expect(entryOf(context, "setAsRoot")?.reason).toBeNull();
  });

  it("turns Move up off on the first row and Move down off on the last", () => {
    const first = pageRow(2, "First", 5);
    const last = pageRow(3, "Last", 5);

    expect(entryOf(contextFor(first, { siblings: [first, last] }), "moveUp")?.reason).toEqual({
      key: "menuFirstItem",
    });
    expect(entryOf(contextFor(first, { siblings: [first, last] }), "moveDown")?.reason).toBeNull();
    expect(entryOf(contextFor(last, { siblings: [first, last] }), "moveDown")?.reason).toEqual({
      key: "menuLastItem",
    });
    expect(entryOf(contextFor(last, { siblings: [first, last] }), "moveUp")?.reason).toBeNull();
  });

  it("asks for the rest of the folder when rows past the last loaded one exist", () => {
    const first = pageRow(2, "First", 5);
    const last = pageRow(3, "Last", 5);
    const context = contextFor(last, { hasMoreSiblings: true, siblings: [first, last] });

    expect(entryOf(context, "moveDown")?.reason).toEqual({ key: "menuLoadRest" });
  });

  it("copies a folder's URL only when it has a root page", () => {
    expect(
      entryOf(contextFor(folderRow(2, "News", 5, { hasRootPage: true })), "copyUrl")?.reason
    ).toBeNull();
    expect(entryOf(contextFor(folderRow(2, "News", 5)), "copyUrl")?.reason).toEqual({
      key: "menuNoFolderUrl",
    });
  });

  it("has no URL to copy or view for a page without a segment", () => {
    const page = pageRow(2, "Draft", 5, { fullPath: "" });
    const context = contextFor(page, { hasPreviewUrl: true });

    expect(entryOf(context, "copyUrl")?.reason).toEqual({ key: "menuNoUrl" });
    expect(entryOf(context, "viewPage")?.reason).toEqual({ key: "menuNoUrl" });
  });
});

describe("buildContextMenu on a ticked row of several", () => {
  it("offers only what works on a selection, and needs update access on every ticked row", () => {
    const ticked = pageRow(2, "A", 5);
    const readOnlyRow = pageRow(3, "B", 5, {
      access: { delete: false, publish: false, update: false },
    });

    expect(idsOf(contextFor(ticked, { targets: [ticked, readOnlyRow] }))).toEqual([["moveTo"]]);
    expect(
      entryOf(contextFor(ticked, { targets: [ticked, readOnlyRow] }), "moveTo")?.reason
    ).toEqual({ key: "menuNoAccess" });
    expect(
      entryOf(contextFor(ticked, { targets: [ticked, pageRow(4, "C", 5)] }), "moveTo")?.reason
    ).toBeNull();
  });
});

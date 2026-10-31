import type { TreeItem } from "../../types.js";
import { pageTypeEntries } from "../Create/createMenu.js";
import type { PageTypeOption } from "../Create/pageTypes.js";
import type { MenuEntry, MenuGroups, MenuReason } from "../Menu/menuEntries.js";
import { rootUpdateModeOf } from "./rootPage.js";
import type { ExistingRoot } from "./rootPage.js";
import { siblingMoveOf } from "./siblingMove.js";
import type { SiblingMoveBlock } from "./siblingMove.js";

/** What the rules need to know about the row a menu opened on and the rows around it. */
export type ContextMenuContext = {
  /** More rows of the item's folder exist than are loaded. */
  hasMoreSiblings: boolean;
  /** The host set `admin.previewUrl`. */
  hasPreviewUrl: boolean;
  /** A move or its preview is in flight: a second one would be dropped. */
  isBusy: boolean;
  /** The row the menu opened on. */
  item: TreeItem;
  /** The page types a new page in the row's folder can have, default first; empty for a page. */
  pageTypes: readonly PageTypeOption[];
  /** The root page the item's folder already has, which Set as root page cannot replace. */
  rootPage: ExistingRoot;
  /** The loaded rows of the item's folder, in order. */
  siblings: readonly TreeItem[];
  /**
   * What the bulk entries act on: the ticked rows when the row is one of them, else the row alone
   * (spec section 7.5 for Move).
   */
  targets: readonly TreeItem[];
};

/** The groups of the menu, in the order the spec table lists them; a divider separates two groups. */
export const contextMenuGroups = ["open", "create", "structure", "share"] as const;

export type ContextMenuGroup = (typeof contextMenuGroups)[number];

export type ContextMenuDefinition = {
  /** Builds the entry, or `null` when it does not apply to this row. */
  build: (context: ContextMenuContext) => MenuEntry | null;
  group: ContextMenuGroup;
  id: string;
  /** Also shown, and acting on every ticked row, when the menu opens on a ticked row of several. */
  appliesToSelection?: boolean;
};

const noAccess: MenuReason = { key: "menuNoAccess" };
const busy: MenuReason = { key: "menuBusy" };

/** Moving needs `update` on every row it moves, and no other move under way. */
const moveReason = (context: ContextMenuContext): MenuReason | null => {
  if (context.isBusy) {
    return busy;
  }

  return context.targets.every((target) => target.access.update) ? null : noAccess;
};

const blockReasons: Record<SiblingMoveBlock, MenuReason> = {
  first: { key: "menuFirstItem" },
  last: { key: "menuLastItem" },
  unloaded: { key: "menuLoadRest" },
};

const siblingMoveEntry =
  (direction: "down" | "up") =>
  (context: ContextMenuContext): MenuEntry => {
    const { blocked } = siblingMoveOf(
      context.item,
      context.siblings,
      context.hasMoreSiblings,
      direction
    );

    return {
      id: direction === "up" ? "moveUp" : "moveDown",
      label: { key: direction === "up" ? "menuMoveUp" : "menuMoveDown" },
      reason: moveReason(context) ?? (blocked === null ? null : blockReasons[blocked]),
    };
  };

const setAsRootReason = (context: ContextMenuContext): MenuReason | null => {
  const { item, rootPage } = context;
  // A live save changes the published URL, which takes publish rights as well.
  const mayChange =
    item.access.update && (rootUpdateModeOf(item) === "draft" || item.access.publish);
  if (!mayChange) {
    return noAccess;
  }
  if (rootPage === null) {
    return null;
  }

  return rootPage === "unknown"
    ? { key: "menuRootTakenUnknown" }
    : { key: "menuRootTaken", variables: { title: rootPage.title } };
};

/** Un-setting a published root page changes its live URL, which takes publish rights as well. */
const unsetRootReason = ({ item }: ContextMenuContext): MenuReason | null =>
  item.access.update && (rootUpdateModeOf(item) === "draft" || item.access.publish)
    ? null
    : noAccess;

/**
 * The menu's entries, in the order of the spec's table (section 7.5). Later tickets add theirs here
 * in that place instead of the menu showing an entry that does nothing: Duplicate (P-46), Publish
 * and Unpublish (P-27), Delete (P-26, P-28).
 */
export const contextMenuDefinitions: ContextMenuDefinition[] = [
  {
    build: () => ({ id: "open", label: { key: "menuOpen" }, reason: null }),
    group: "open",
    id: "open",
  },
  {
    build: ({ item }) =>
      item.kind === "page"
        ? { id: "openInNewTab", label: { key: "menuOpenInNewTab" }, reason: null }
        : null,
    group: "open",
    id: "openInNewTab",
  },
  {
    // Creating adds to the folder, so it needs the same right as changing it; the rows carry no
    // `create` flag, and the server checks again.
    build: ({ item, pageTypes }) =>
      item.kind === "folder" && pageTypes.length > 0
        ? {
            children: pageTypeEntries(pageTypes),
            id: "createPage",
            label: { key: "menuCreatePage" },
            reason: item.access.update ? null : noAccess,
          }
        : null,
    group: "create",
    id: "createPage",
  },
  {
    build: ({ item }) =>
      item.kind === "folder"
        ? {
            id: "createFolder",
            label: { key: "menuCreateFolder" },
            reason: item.access.update ? null : noAccess,
          }
        : null,
    group: "create",
    id: "createFolder",
  },
  {
    // Settings opens the folder's or the page's drawer, and changes what the drawer saves.
    build: ({ item }) => ({
      id: "settings",
      label: { key: "actionSettings" },
      reason: item.access.update ? null : noAccess,
    }),
    group: "structure",
    id: "settings",
  },
  {
    // A page that is already the root has Unset root page instead.
    build: (context) => {
      if (context.item.kind !== "page") {
        return null;
      }

      return context.item.isFolderRoot === true
        ? { id: "unsetRoot", label: { key: "menuUnsetRoot" }, reason: unsetRootReason(context) }
        : { id: "setAsRoot", label: { key: "menuSetAsRoot" }, reason: setAsRootReason(context) };
    },
    group: "structure",
    id: "setAsRoot",
  },
  {
    appliesToSelection: true,
    build: (context) => ({
      id: "move",
      label: { key: "actionMove" },
      reason: moveReason(context),
    }),
    group: "structure",
    id: "move",
  },
  {
    appliesToSelection: true,
    build: (context) => ({
      id: "moveTo",
      label: { key: "actionMoveTo" },
      reason: moveReason(context),
    }),
    group: "structure",
    id: "moveTo",
  },
  { build: siblingMoveEntry("up"), group: "structure", id: "moveUp" },
  { build: siblingMoveEntry("down"), group: "structure", id: "moveDown" },
  {
    build: ({ item }) => {
      if (item.kind === "page") {
        return {
          id: "copyUrl",
          label: { key: "menuCopyUrl" },
          reason: item.fullPath === "" ? { key: "menuNoUrl" } : null,
        };
      }

      // A folder has a URL of its own only through its root page.
      return {
        id: "copyUrl",
        label: { key: "menuCopyUrl" },
        reason: item.hasRootPage === true ? null : { key: "menuNoFolderUrl" },
      };
    },
    group: "share",
    id: "copyUrl",
  },
  {
    build: ({ hasPreviewUrl, item }) =>
      item.kind === "page" && hasPreviewUrl
        ? {
            id: "viewPage",
            label: { key: "menuViewPage" },
            reason: item.fullPath === "" ? { key: "menuNoUrl" } : null,
          }
        : null,
    group: "share",
    id: "viewPage",
  },
];

/**
 * The groups of entries for a row's menu. Opened on one of several ticked rows, the menu holds
 * only what works on a selection; every other row gets the full menu for itself.
 */
export const buildContextMenu = (
  context: ContextMenuContext,
  definitions: readonly ContextMenuDefinition[] = contextMenuDefinitions
): MenuGroups => {
  const isSelection = context.targets.length > 1;
  const entries = definitions
    .filter((definition) => !isSelection || definition.appliesToSelection === true)
    .map((definition) => ({ entry: definition.build(context), group: definition.group }));

  return contextMenuGroups
    .map((group) =>
      entries.flatMap((candidate) =>
        candidate.group === group && candidate.entry !== null ? [candidate.entry] : []
      )
    )
    .filter((group) => group.length > 0);
};

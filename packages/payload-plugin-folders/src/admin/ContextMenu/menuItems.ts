import type { TreeItem } from "../../types.js";
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

/**
 * The menu's entries, in the order of the spec's table (section 7.5). Later tickets add theirs here
 * in that place instead of the menu showing an entry that does nothing: Settings (P-40), Unset root
 * page (P-40), Duplicate (P-46), Publish and Unpublish (P-27), Delete (P-26, P-28).
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
    // A page that is already the root has Unset root page instead, which a later ticket adds.
    build: (context) =>
      context.item.kind === "page" && context.item.isFolderRoot !== true
        ? { id: "setAsRoot", label: { key: "menuSetAsRoot" }, reason: setAsRootReason(context) }
        : null,
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

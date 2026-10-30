import { toast } from "@payloadcms/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { TreeItem } from "../../types.js";
import { createPageEntryPrefix } from "../Create/createMenu.js";
import { pageTypeOptionsOf } from "../Create/pageTypes.js";
import { fetchPreviewUrl } from "../api.js";
import type { FoldersApiContext } from "../api.js";
import { editViewUrl } from "../compat.js";
import type { Translate } from "../compat.js";
import { PopupMenu } from "../Menu/PopupMenu.js";
import type { MenuAnchor } from "../Menu/menuEntries.js";
import type { MoveTarget } from "../Move/moveFlow.js";
import { folderKeyOf, itemKeyOf } from "../store.js";
import type { TreeStore, TreeStoreState } from "../store.js";
import type { SelectionApi } from "../useSelection.js";
import type { TreeRowModel } from "../Tree/useTreeData.js";
import { buildContextMenu } from "./menuItems.js";
import type { ContextMenuContext, ContextMenuDefinition } from "./menuItems.js";
import { existingRootOf } from "./rootPage.js";
import { siblingMoveOf } from "./siblingMove.js";

/** The flows a menu entry starts; each one belongs to the ticket that built it. */
export type ContextMenuActions = {
  /** "Create folder here": opens New folder inside this folder. */
  createFolder: (folder: TreeItem) => void;
  /** An entry of "Create page here": opens New page in this folder with that page type. */
  createPage: (folder: TreeItem, collection: string) => void;
  /** "Move": starts Move mode for these rows. */
  moveMode: (items: readonly TreeItem[]) => void;
  /** "Move to...": opens the folder picker for these rows. */
  moveTo: (items: readonly TreeItem[]) => void;
  /** Opens a page's edit view in this tab. */
  openPage: (url: string) => void;
  /** Moves one row one place up or down its folder. */
  moveWithinFolder: (item: TreeItem, target: MoveTarget) => void;
  setAsRoot: (item: TreeItem) => void;
};

export type ContextMenuOptions = {
  actions: ContextMenuActions;
  adminRoute: string;
  apiContext: FoldersApiContext;
  /** The menu's entries, `contextMenuDefinitions` unless a test passes its own. */
  definitions?: readonly ContextMenuDefinition[];
  hasPreviewUrl: boolean;
  /** A move or its preview is in flight. */
  isBusy: boolean;
  rows: readonly TreeRowModel[];
  selection: SelectionApi;
  state: TreeStoreState;
  store: TreeStore;
  translate: Translate;
  /** Page collection slug to label, in the host's order. */
  typeLabels: Readonly<Record<string, string>>;
};

type OpenRequest = {
  anchor: MenuAnchor;
  itemKey: string;
  /** Where focus goes when the keyboard closes the menu; `null` for a pointer. */
  returnFocus: HTMLElement | null;
};

export type ContextMenuApi = {
  menu: ReactNode;
  /** The key of the row whose menu is open, for the row's button to show it. */
  openItemKey: string | null;
  openMenu: (item: TreeItem, anchor: MenuAnchor, returnFocus: HTMLElement | null) => void;
};

/**
 * The context menu of the tree rows (spec section 7.5): which row it is open on, the entries the
 * rules give that row, and what each entry starts. The menu reads the rows live, so a row that
 * left the tree closes it, and the rules always see the folder as it is now.
 */
export const useContextMenu = ({
  actions,
  adminRoute,
  apiContext,
  definitions,
  hasPreviewUrl,
  isBusy,
  rows,
  selection,
  state,
  store,
  translate,
  typeLabels,
}: ContextMenuOptions): ContextMenuApi => {
  const [request, setRequest] = useState<OpenRequest | null>(null);

  const item = useMemo<TreeItem | null>(() => {
    if (request === null) {
      return null;
    }
    const row = rows.find(
      (candidate) => candidate.type === "item" && candidate.key === request.itemKey
    );

    return row?.type === "item" ? row.item : null;
  }, [request, rows]);

  // The row left the tree (a refresh moved it away): there is nothing for the menu to act on.
  useEffect(() => {
    if (request !== null && item === null) {
      setRequest(null);
    }
  }, [item, request]);

  const context = useMemo<ContextMenuContext | null>(() => {
    if (item === null) {
      return null;
    }
    const entry = state.childrenByFolder[folderKeyOf(item.parentId)];
    const isTicked = selection.isSelected(item);

    return {
      hasMoreSiblings: entry?.hasMore ?? false,
      hasPreviewUrl,
      isBusy,
      item,
      pageTypes: item.kind === "folder" ? pageTypeOptionsOf(item, typeLabels) : [],
      rootPage: item.kind === "page" ? existingRootOf(item, state) : null,
      siblings: entry?.items ?? [],
      targets: isTicked && selection.items.length > 1 ? selection.items : [item],
    };
  }, [hasPreviewUrl, isBusy, item, selection, state, typeLabels]);

  const groups = useMemo(
    () => (context === null ? [] : buildContextMenu(context, definitions)),
    [context, definitions]
  );

  const openMenu = useCallback(
    (target: TreeItem, anchor: MenuAnchor, returnFocus: HTMLElement | null) => {
      setRequest({ anchor, itemKey: itemKeyOf(target), returnFocus });
    },
    []
  );

  const close = useCallback(
    (restoreFocus: boolean) => {
      if (restoreFocus && request?.returnFocus?.isConnected) {
        request.returnFocus.focus();
      }
      setRequest(null);
    },
    [request]
  );

  const copyUrl = useCallback(
    async (target: TreeItem) => {
      try {
        await navigator.clipboard.writeText(target.fullPath);
        toast.success(translate("menuCopied", { path: target.fullPath }));
      } catch {
        toast.error(translate("menuCopyFailed"));
      }
    },
    [translate]
  );

  const viewPage = useCallback(
    async (target: TreeItem) => {
      try {
        const { url } = await fetchPreviewUrl(apiContext, {
          collection: target.collection,
          fullPath: target.fullPath,
          locale: store.getOptions()?.locale ?? null,
        });
        window.open(url, "_blank", "noopener");
      } catch {
        toast.error(translate("menuViewPageFailed"));
      }
    },
    [apiContext, store, translate]
  );

  const select = useCallback(
    (entryId: string) => {
      if (context === null) {
        return;
      }
      const { item: target, targets } = context;
      switch (entryId) {
        case "open": {
          if (target.kind === "page") {
            actions.openPage(editViewUrl(adminRoute, target.collection, target.id));
          } else {
            // Zooming into a folder is the zoom ticket's (P-35); until then opening it expands it.
            void store.setExpanded(target.id, true);
          }
          break;
        }
        case "openInNewTab": {
          window.open(editViewUrl(adminRoute, target.collection, target.id), "_blank", "noopener");
          break;
        }
        case "setAsRoot": {
          actions.setAsRoot(target);
          break;
        }
        case "move": {
          actions.moveMode(targets);
          break;
        }
        case "moveTo": {
          actions.moveTo(targets);
          break;
        }
        case "moveUp":
        case "moveDown": {
          const { target: moveTarget } = siblingMoveOf(
            target,
            context.siblings,
            context.hasMoreSiblings,
            entryId === "moveUp" ? "up" : "down"
          );
          if (moveTarget !== null) {
            actions.moveWithinFolder(target, moveTarget);
          }
          break;
        }
        case "copyUrl": {
          void copyUrl(target);
          break;
        }
        case "viewPage": {
          void viewPage(target);
          break;
        }
        case "createFolder": {
          actions.createFolder(target);
          break;
        }
        default: {
          if (entryId.startsWith(createPageEntryPrefix)) {
            actions.createPage(target, entryId.slice(createPageEntryPrefix.length));
          }
          break;
        }
      }
    },
    [actions, adminRoute, context, copyUrl, store, viewPage]
  );

  const menu =
    request !== null && item !== null && groups.length > 0 ? (
      <PopupMenu
        anchor={request.anchor}
        groups={groups}
        label={translate("menuLabel", { name: item.title })}
        onClose={close}
        onSelect={select}
        translate={translate}
      />
    ) : null;

  return { menu, openItemKey: request === null ? null : request.itemKey, openMenu };
};

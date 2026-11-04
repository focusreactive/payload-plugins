import { toast, useModal } from "@payloadcms/ui";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject, RefObject } from "react";

import type { TreeItem } from "../../types.js";
import { editViewUrl } from "../compat.js";
import type { Translate } from "../compat.js";
import { dropRefusalText } from "../DragAndDrop/dropRefusalText.js";
import { resolveDrop } from "../DragAndDrop/dropTargets.js";
import type { DropRules } from "../DragAndDrop/dropTargets.js";
import type { DropMove } from "../Move/useMoveFlow.js";
import { isTextEntry } from "../Settings/settingsKey.js";
import { findLoadedFolder, folderKeyOf, itemKeyOf, loadedItemsOf } from "../store.js";
import type { TreeStore, TreeStoreState } from "../store.js";
import type { TreeRowModel } from "../Tree/useTreeData.js";
import type { SelectionApi } from "../useSelection.js";
import {
  focusRowWhenShown,
  hasLostFocus,
  isMenuOpen,
  rowElementOf,
  rowKeyOfElement,
} from "./focusRow.js";
import { createReorderController } from "./reorder.js";
import type { ReorderController } from "./reorder.js";
import {
  itemRowsOf,
  navigationFor,
  neighbourKeyOf,
  tabStopKeyOf,
  treeKeyActionOf,
} from "./treeKeys.js";
import {
  forgetFocusedWorkspace,
  isKeyForWorkspace,
  rememberFocusedWorkspace,
  workspaceElementOf,
} from "./workspaceScope.js";

export type TreeKeyboardActions = {
  /** Delete and Backspace: opens the delete dialog for these rows. */
  delete: (items: readonly TreeItem[]) => void;
  /** Cmd/Ctrl+D: opens the duplicate dialog for these rows. */
  duplicate: (items: readonly TreeItem[]) => void;
  /** Escape in a search: back to the tree, with this hit's folders open and its row focused. */
  leaveSearch: (focused: TreeItem | null) => void;
  /** Enter on a folder that cannot be opened in place (a search hit): zooms into it. */
  openFolder: (folder: TreeItem) => void;
  /** Enter on a page: opens its edit view. */
  openPage: (url: string) => void;
  startDropMove: (drop: DropMove) => Promise<void>;
  /** Cmd/Ctrl+Z: undoes the last move while its toast is on screen; false when there is none. */
  undoLastMove: () => boolean;
};

export type TreeKeyboardOptions = {
  actions: TreeKeyboardActions;
  adminRoute: string;
  /** A move or its preview is in flight. */
  isBusy: boolean;
  /** The sidebar tab's tree, not the tree view's. */
  isCompact: boolean;
  /** Move mode has the keyboard: its own keys decide. */
  isMoveModeActive: boolean;
  isSearching: boolean;
  /** The rows on screen: the tree's, or a search's hits. */
  rows: readonly TreeRowModel[];
  rules: DropRules;
  selection: SelectionApi;
  state: TreeStoreState;
  store: TreeStore;
  translate: Translate;
};

export type TreeKeyboard = {
  /** The one row in the tab order. */
  activeKey: string | null;
  /** The rows that were cut and wait to be pasted. */
  cutKeys: ReadonlySet<string>;
  /** What the live region says now; `nonce` makes the same words read out again. */
  liveMessage: { nonce: number; text: string };
  /** Focus entered the tree: the row it is in becomes the one in the tab order. */
  onFocus: (target: EventTarget) => void;
  /**
   * Set by the tree: brings a row into view when a long tree does not draw it, so the keyboard can
   * focus a row that is not in the page (End on 2,000 rows).
   */
  revealRowRef: MutableRefObject<((key: string) => void) | null>;
  /** The ref of the treegrid element: the keyboard follows whichever one is on screen. */
  bindTree: (tree: HTMLDivElement) => () => void;
  /** The treegrid's element: keys count as the tree's only while the focus is inside it. */
  treeRef: RefObject<HTMLDivElement | null>;
};

const isTypingTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  isTextEntry({
    inputType: target instanceof HTMLInputElement ? target.type : null,
    isContentEditable: target.isContentEditable,
    tagName: target.tagName,
  });

/** A drag is in progress: dnd-kit cancels it on Escape and the key is not the tree's. */
const isDragging = (): boolean => document.body.classList.contains("fr-folders-dragging");

/** The search box of the workspace the key is for; the tab and the view each have one. */
const focusSearchInput = (workspace: Element | null): boolean => {
  const input = workspace?.querySelector<HTMLInputElement>('[data-testid="search-input"]');
  if (!input) {
    return false;
  }
  input.focus();
  input.select();

  return true;
};

/**
 * Every key of spec section 7.6 that is the tree's: arrows, Home and End, Enter and Space,
 * selection, cut and paste, the Alt moves, duplicate, delete, undo, Escape and `/`. One listener on
 * the document, because `/` and Escape work from anywhere on the page; the rest count only while
 * the focus is inside the tree, never in a text field, a dialog or a menu, and never in Move mode,
 * which has its own keys. Also keeps the roving tab index (one row in the tab order), the cut rows,
 * and a live region that says what a key did.
 */
export const useTreeKeyboard = (options: TreeKeyboardOptions): TreeKeyboard => {
  const { rows, store } = options;
  const treeRef = useRef<HTMLDivElement | null>(null);
  const revealRowRef = useRef<((key: string) => void) | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [cutItems, setCutItems] = useState<readonly TreeItem[]>([]);
  const [liveMessage, setLiveMessage] = useState({ nonce: 0, text: "" });
  const { modalState } = useModal();
  const isModalOpen = Object.values(modalState).some((modal) => modal.isOpen);

  const itemRows = useMemo(() => itemRowsOf(rows), [rows]);
  const tabStopKey = tabStopKeyOf(itemRows, activeKey);

  const latest = useRef(options);
  latest.current = options;
  const modalOpenRef = useRef(isModalOpen);
  modalOpenRef.current = isModalOpen;
  const cutRef = useRef(cutItems);
  cutRef.current = cutItems;

  const announce = useCallback((text: string) => {
    setLiveMessage((current) => ({ nonce: current.nonce + 1, text }));
  }, []);

  // The reorder controller holds the store, which never changes; the move itself goes through the
  // flow the workspace passes in, read at the time of the press.
  const reorderRef = useRef<ReorderController | null>(null);
  reorderRef.current ??= createReorderController({
    commit: ({ item, onAbandon, onBeforeApply, target }) => {
      const current = latest.current;
      const folder = findLoadedFolder(current.state, item.parentId);
      void current.actions.startDropMove({
        items: [item],
        onAbandon,
        onBeforeApply,
        onMoved: () => focusRowWhenShown(item, () => treeRef.current),
        selection: null,
        target,
        targetTitle: folder?.title ?? current.translate("moveToRoot"),
      });
    },
    store,
  });
  // Leaving the page with presses still waiting sends them: the editor pressed Alt+Down and moved
  // on, and the rows they saw move are the move they asked for. A move that needs a confirmation
  // cannot ask once the page is gone, so the move flow drops that one and puts the rows back.
  useEffect(
    () => () => {
      reorderRef.current?.flush();
    },
    []
  );

  // A row that moved in the DOM can lose the focus, and the next key press would then not find it:
  // the focus goes back to it in the same turn the rows are drawn, before the next key.
  const keepFocusOn = useRef<string | null>(null);
  useLayoutEffect(() => {
    const key = keepFocusOn.current;
    if (key === null) {
      return;
    }
    keepFocusOn.current = null;
    const row = itemRows.find((candidate) => candidate.key === key);
    if (row !== undefined && hasLostFocus()) {
      rowElementOf(row.item, treeRef.current)?.focus();
    }
  });

  // Whether the focus is on a row or in one (a marker of Move mode, which puts the focus back itself
  // when it ends, is not a row). Chrome reports a focusout when the element that has the focus
  // is taken out of the page, with that element still attached, and Firefox reports none: so a
  // focusout with nowhere to go is judged after the render that may have removed the element, and
  // counts as leaving only when the element is still there.
  const hasFocusInRow = useRef(false);
  // The workspace draws a different treegrid element for the search hits and for the tree, so the
  // listeners follow the element through its ref instead of staying on the one drawn at mount.
  const bindTree = useCallback((tree: HTMLDivElement) => {
    treeRef.current = tree;
    const handleFocusIn = (event: FocusEvent) => {
      hasFocusInRow.current = rowKeyOfElement(event.target as Element | null) !== null;
    };
    const handleFocusOut = (event: FocusEvent) => {
      const { relatedTarget, target } = event;
      if (relatedTarget instanceof Node) {
        if (!tree.contains(relatedTarget)) {
          hasFocusInRow.current = false;
        }

        return;
      }
      queueMicrotask(() => {
        if (target instanceof Node && target.isConnected) {
          hasFocusInRow.current = false;
        }
      });
    };
    tree.addEventListener("focusin", handleFocusIn);
    tree.addEventListener("focusout", handleFocusOut);

    return () => {
      tree.removeEventListener("focusin", handleFocusIn);
      tree.removeEventListener("focusout", handleFocusOut);
      if (treeRef.current === tree) {
        treeRef.current = null;
      }
    };
  }, []);

  // The focus entering a workspace, anywhere in it (the search box and the header too), makes it the
  // one that answers a page-wide key pressed while the focus is on neither.
  const { isCompact } = options;
  useEffect(() => {
    const workspace = workspaceElementOf(isCompact);
    if (workspace === null) {
      return undefined;
    }
    const handleFocusIn = () => rememberFocusedWorkspace(workspace);
    workspace.addEventListener("focusin", handleFocusIn);

    return () => {
      workspace.removeEventListener("focusin", handleFocusIn);
      forgetFocusedWorkspace(workspace);
    };
  }, [isCompact]);

  // The focus fell to the page from inside the tree because what had it was removed: it goes back
  // to the row the keyboard was on, in the commit that removed it, so the next key finds it.
  useLayoutEffect(() => {
    if (!hasFocusInRow.current || modalOpenRef.current || !hasLostFocus() || activeKey === null) {
      return;
    }
    const row = itemRows.find((candidate) => candidate.key === activeKey);
    if (row !== undefined) {
      rowElementOf(row.item, treeRef.current)?.focus();
    }
  });

  const focusKey = useCallback((key: string) => {
    const row = latest.current.rows.find(
      (candidate) => candidate.type === "item" && candidate.key === key
    );
    if (row?.type !== "item") {
      return;
    }
    const element = rowElementOf(row.item, treeRef.current);
    if (element !== null) {
      element.focus();

      return;
    }
    // A long tree draws only the rows near the view: bring this one in, then focus it.
    revealRowRef.current?.(key);
    focusRowWhenShown(
      row.item,
      () => treeRef.current,
      () => hasLostFocus() || treeRef.current?.contains(document.activeElement) === true
    );
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const current = latest.current;
      if (
        event.defaultPrevented ||
        event.isComposing ||
        modalOpenRef.current ||
        isMenuOpen() ||
        isTypingTarget(event.target)
      ) {
        return;
      }
      const action = treeKeyActionOf(event);
      if (action === null) {
        return;
      }
      const consume = () => event.preventDefault();

      const isPageWideKey = action === "focusSearch" || action === "undo" || action === "escape";
      const workspace = workspaceElementOf(current.isCompact);
      if (isPageWideKey && !isKeyForWorkspace(workspace, event.target)) {
        return;
      }

      if (action === "focusSearch") {
        if (focusSearchInput(workspace)) {
          consume();
        }

        return;
      }
      if (action === "undo") {
        if (current.actions.undoLastMove()) {
          consume();
        }

        return;
      }

      const rowsNow = itemRowsOf(current.rows);
      const target = event.target instanceof Element ? event.target : null;
      const focusedKey = rowKeyOfElement(target);
      const focusedRow = rowsNow.find((row) => row.key === focusedKey);

      if (action === "escape") {
        // A drag cancels itself and Move mode leaves itself: neither is this key's.
        if (isDragging() || current.isMoveModeActive) {
          return;
        }
        if (cutRef.current.length > 0) {
          consume();
          setCutItems([]);
          announce(current.translate("announceCutCancelled"));
        } else if (current.selection.items.length > 0) {
          consume();
          current.selection.clear();
        } else if (current.isSearching) {
          consume();
          current.actions.leaveSearch(focusedRow?.item ?? null);
        }

        return;
      }

      // The rest are the tree's own: the focus is inside it, and Move mode is not on.
      if (current.isMoveModeActive || !(target && treeRef.current?.contains(target))) {
        return;
      }
      const isOnRow = target === target.closest('[data-testid="tree-row"]');

      if (action === "selectAll") {
        consume();
        current.selection.select(rowsNow.map((row) => row.item));

        return;
      }
      if (focusedRow === undefined) {
        return;
      }
      const { item } = focusedRow;
      // Enter and Space on a button, a link or a checkbox inside the row are that control's own.
      if ((action === "activate" || action === "toggleSelection") && !isOnRow) {
        return;
      }

      // What delete, duplicate and cut act on: the ticked rows when the focused one is ticked,
      // else the focused row alone.
      const targets =
        current.selection.isSelected(item) && current.selection.items.length > 0
          ? current.selection.items
          : [item];

      switch (action) {
        case "activate": {
          consume();
          if (item.kind === "page") {
            reorderRef.current?.flush();
            current.actions.openPage(editViewUrl(current.adminRoute, item.collection, item.id));
          } else if (focusedRow.expandable) {
            void current.store.toggleExpanded(item.id);
          } else {
            reorderRef.current?.flush();
            current.actions.openFolder(item);
          }

          return;
        }
        case "toggleSelection": {
          consume();
          current.selection.toggle(item);

          return;
        }
        case "focusFirst":
        case "focusLast":
        case "focusNext":
        case "focusPrevious":
        case "expandOrFirstChild":
        case "collapseOrParent": {
          const navigation = navigationFor(action, rowsNow, focusedRow.key);
          if (navigation === null) {
            return;
          }
          consume();
          if (navigation.type === "focus") {
            focusKey(navigation.key);
          } else {
            void current.store.setExpanded(navigation.id, navigation.type === "expand");
          }

          return;
        }
        case "extendDown":
        case "extendUp": {
          const navigation = navigationFor(
            action === "extendDown" ? "focusNext" : "focusPrevious",
            rowsNow,
            focusedRow.key
          );
          consume();
          if (navigation?.type !== "focus") {
            return;
          }
          // The row the extension starts from is ticked too.
          if (!current.selection.isSelected(item)) {
            current.selection.toggle(item);
          }
          const next = rowsNow.find((row) => row.key === navigation.key);
          if (next !== undefined) {
            current.selection.selectRange(next.item);
          }
          focusKey(navigation.key);

          return;
        }
        case "delete": {
          consume();
          current.actions.delete(targets);

          return;
        }
        case "duplicate": {
          consume();
          current.actions.duplicate(targets);

          return;
        }
        case "cut": {
          consume();
          setCutItems(targets);
          announce(current.translate("announceCut", { count: targets.length }));

          return;
        }
        case "paste": {
          if (cutRef.current.length === 0) {
            return;
          }
          consume();
          const cut = cutRef.current;
          const loaded = new Map(loadedItemsOf(current.state).map((row) => [itemKeyOf(row), row]));
          const dragged = cut.map((row) => loaded.get(itemKeyOf(row)) ?? row);
          const resolution = resolveDrop({
            dragged,
            over: { key: focusedRow.key, zone: item.kind === "folder" ? "inside" : "after" },
            rows: current.rows,
            rules: current.rules,
            state: current.state,
          });
          if (resolution === null) {
            return;
          }
          if (resolution.refusal !== null) {
            const reason = dropRefusalText(resolution.refusal, current.translate);
            announce(current.translate("announcePasteRefused", { reason }));
            toast.error(current.translate("announcePasteRefused", { reason }));

            return;
          }
          if (resolution.isNoOp) {
            setCutItems([]);

            return;
          }
          const [first] = dragged;
          void current.actions.startDropMove({
            items: dragged,
            onMoved: () => {
              setCutItems([]);
              if (first !== undefined) {
                focusRowWhenShown(first, () => treeRef.current);
              }
            },
            selection: null,
            target: resolution.target,
            targetTitle: resolution.targetFolder?.title ?? current.translate("moveToRoot"),
          });

          return;
        }
        case "moveUp":
        case "moveDown": {
          consume();
          const reorder = reorderRef.current as ReorderController;
          if (current.isBusy && !reorder.hasPending()) {
            return;
          }
          const result = reorder.press(item, action === "moveUp" ? "up" : "down");
          if (result.type === "moved") {
            announce(
              current.translate("announceMovePosition", {
                name: item.title,
                position: result.position,
                total: result.total,
              })
            );
          } else if (result.type === "blocked") {
            announce(
              result.blocked === "unloaded"
                ? current.translate("announceNotLoaded", { name: item.title })
                : current.translate(
                    result.blocked === "first" ? "announceAlreadyFirst" : "announceAlreadyLast",
                    { name: item.title }
                  )
            );
          }
          keepFocusOn.current = focusedRow.key;

          return;
        }
        case "moveOut":
        case "moveIn": {
          consume();
          const reorder = reorderRef.current as ReorderController;
          if (reorder.hasPending()) {
            reorder.flush();

            return;
          }
          if (current.isBusy) {
            return;
          }
          if (action === "moveOut") {
            if (item.parentId === null) {
              announce(current.translate("announceMoveOutTopLevel", { name: item.title }));

              return;
            }
            const parent = findLoadedFolder(current.state, item.parentId);
            if (parent === null) {
              announce(current.translate("announceNotLoaded", { name: item.title }));

              return;
            }
            const grandparent = findLoadedFolder(current.state, parent.parentId);
            void current.actions.startDropMove({
              items: [item],
              onMoved: () => focusRowWhenShown(item, () => treeRef.current),
              selection: null,
              target: {
                after: { collection: parent.collection, id: parent.id },
                toFolder: parent.parentId,
              },
              targetTitle: grandparent?.title ?? current.translate("moveToRoot"),
            });

            return;
          }
          const siblings = current.state.childrenByFolder[folderKeyOf(item.parentId)]?.items ?? [];
          const above =
            siblings[siblings.findIndex((row) => itemKeyOf(row) === focusedRow.key) - 1];
          if (above === undefined || above.kind !== "folder") {
            announce(current.translate("announceMoveInNoFolder", { name: item.title }));

            return;
          }
          // Opened first, so the row has a place to land in and stays on screen.
          void (async () => {
            await current.store.setExpanded(above.id, true);
            await current.actions.startDropMove({
              items: [item],
              onMoved: () => focusRowWhenShown(item, () => treeRef.current),
              selection: null,
              target: { position: "start", toFolder: above.id },
              targetTitle: above.title,
            });
          })();

          return;
        }
        default: {
          return;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [announce, focusKey]);

  // The row that has the focus is the one in the tab order.
  const onFocus = useCallback((target: EventTarget) => {
    const key = target instanceof Element ? rowKeyOfElement(target) : null;
    if (key !== null) {
      setActiveKey(key);
    }
  }, []);

  // Only the row in the tab order is a stop: the controls inside the other rows are reached from
  // their row, so Tab does not walk through every checkbox and menu button of a long tree. A long
  // tree draws rows as it scrolls, so the rows that come in are set too.
  useEffect(() => {
    const tree = treeRef.current;
    if (tree === null) {
      return undefined;
    }
    const setTabStops = () => {
      for (const row of tree.querySelectorAll<HTMLElement>('[data-testid="tree-row"]')) {
        const isStop = rowKeyOfElement(row) === tabStopKey;
        for (const control of row.querySelectorAll<HTMLElement>("a[href], button, input")) {
          if (isStop) {
            control.removeAttribute("tabindex");
          } else {
            control.tabIndex = -1;
          }
        }
      }
    };
    setTabStops();
    const observer = new MutationObserver(setTabStops);
    observer.observe(tree, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [itemRows, tabStopKey]);

  // The row that had the focus is gone (deleted, moved out of view, a search ended): the one that
  // now stands in its place takes the focus, so the keyboard is not left on the page.
  const previousKeys = useRef<string[]>([]);
  useEffect(() => {
    const keys = itemRows.map((row) => row.key);
    if (activeKey !== null && !keys.includes(activeKey) && keys.length > 0) {
      const next = neighbourKeyOf(itemRows, previousKeys.current, activeKey);
      setActiveKey(next);
      if (next !== null && hasLostFocus() && !modalOpenRef.current) {
        focusKey(next);
      }
    }
    previousKeys.current = keys;
  }, [activeKey, focusKey, itemRows]);

  // A dialog closed and the focus did not come back to anything (what opened it was a menu item,
  // which is gone): it goes to the row the keyboard was on. The focus trap hands the focus back a
  // moment after the dialog has gone, so this looks for a short while before it gives up. Only a
  // keyboard that was on a row before is brought back; a pointer user has no row to return to.
  const restoreKey = useRef<string | null>(null);
  restoreKey.current = activeKey === null ? null : tabStopKey;
  const wasModalOpen = useRef(false);
  useEffect(() => {
    if (isModalOpen) {
      wasModalOpen.current = true;

      return undefined;
    }
    if (!wasModalOpen.current) {
      return undefined;
    }
    wasModalOpen.current = false;
    let ticks = 0;
    const timer = setInterval(() => {
      ticks += 1;
      const key = restoreKey.current;
      if (key !== null && hasLostFocus()) {
        focusKey(key);
        clearInterval(timer);
      } else if (ticks >= 8) {
        clearInterval(timer);
      }
    }, 50);

    return () => clearInterval(timer);
  }, [focusKey, isModalOpen]);

  // The cut rows that are no longer there are not waiting for a paste.
  useEffect(() => {
    if (cutItems.length === 0) {
      return;
    }
    const keys = new Set(loadedItemsOf(options.state).map(itemKeyOf));
    if (cutItems.every((item) => !keys.has(itemKeyOf(item)))) {
      setCutItems([]);
    }
  }, [cutItems, options.state]);

  const cutKeys = useMemo(() => new Set(cutItems.map(itemKeyOf)), [cutItems]);

  return {
    activeKey: tabStopKey,
    bindTree,
    cutKeys,
    liveMessage,
    onFocus,
    revealRowRef,
    treeRef,
  };
};

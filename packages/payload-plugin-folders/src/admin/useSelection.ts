import { useCallback, useEffect, useMemo, useState } from "react";

import type { TreeItem } from "../types.js";
import {
  emptySelection,
  headerCheckboxStateOf,
  pruneKeys,
  selectedItemsOf,
  selectOnly,
  selectRangeTo,
  toggleAllKeys,
  toggleKey,
} from "./selection.js";
import type { HeaderCheckboxState, SelectionState } from "./selection.js";
import { itemKeyOf } from "./store.js";

export type SelectionApi = {
  /** Unticks everything: the toolbar's Cancel. */
  clear: () => void;
  /** What the header checkbox shows over the loaded rows. */
  headerState: HeaderCheckboxState;
  isSelected: (item: TreeItem) => boolean;
  /** The ticked rows, in the order they are on screen. */
  items: TreeItem[];
  /** Ticks exactly these rows: puts the selection back after a move was refused. */
  select: (items: readonly TreeItem[]) => void;
  /** Shift click: ticks from the last ticked row to this one. */
  selectRange: (item: TreeItem) => void;
  /** Checkbox or Cmd/Ctrl click: ticks the row, or unticks it. */
  toggle: (item: TreeItem) => void;
  /** The header checkbox: every loaded row, or none when every loaded row is ticked. */
  toggleAll: () => void;
};

/**
 * The selection of the tree rows on screen (spec section 7.2). `loadedItems` is every row the
 * editor can see, in screen order; the selection never holds a row outside it, so the header
 * checkbox and the toolbar act on what is loaded and open, not on the whole tree.
 */
export const useSelection = (loadedItems: readonly TreeItem[]): SelectionApi => {
  const [state, setState] = useState<SelectionState>(emptySelection);
  const rowKeys = useMemo(() => loadedItems.map(itemKeyOf), [loadedItems]);

  // A row that closed, moved or went away leaves the selection, so no action reaches a row that
  // is out of sight. State is replaced only when something actually left.
  useEffect(() => {
    setState((current) => pruneKeys(current, rowKeys));
  }, [rowKeys]);

  const toggle = useCallback((item: TreeItem) => {
    setState((current) => toggleKey(current, itemKeyOf(item)));
  }, []);
  const selectRange = useCallback(
    (item: TreeItem) => {
      setState((current) => selectRangeTo(current, rowKeys, itemKeyOf(item)));
    },
    [rowKeys]
  );
  const toggleAll = useCallback(() => {
    setState((current) => toggleAllKeys(current, rowKeys));
  }, [rowKeys]);
  const clear = useCallback(() => setState(emptySelection), []);
  const select = useCallback((items: readonly TreeItem[]) => {
    setState(selectOnly(items.map(itemKeyOf)));
  }, []);

  const visibleState = useMemo(() => pruneKeys(state, rowKeys), [state, rowKeys]);
  const items = useMemo(
    () => selectedItemsOf(visibleState, loadedItems),
    [visibleState, loadedItems]
  );
  const ticked = useMemo(() => new Set(visibleState.keys), [visibleState]);
  const isSelected = useCallback((item: TreeItem) => ticked.has(itemKeyOf(item)), [ticked]);

  return {
    clear,
    headerState: headerCheckboxStateOf(visibleState, rowKeys),
    isSelected,
    items,
    select,
    selectRange,
    toggle,
    toggleAll,
  };
};

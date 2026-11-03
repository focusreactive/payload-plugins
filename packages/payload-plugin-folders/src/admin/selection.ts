import { itemKeyOf } from "./store.js";
import type { TreeItem } from "../types.js";

/**
 * What the editor ticked: the keys in tick order, and the row the next Shift click starts from.
 * Plain data, so the rules below are tested without a browser.
 */
export type SelectionState = {
  /** The row last ticked or unticked: where a Shift click range starts. */
  anchor: string | null;
  keys: readonly string[];
};

export const emptySelection: SelectionState = { anchor: null, keys: [] };

export type HeaderCheckboxState = "all" | "none" | "some";

/** Ticks a row, or unticks it when it was ticked; either way it becomes the range anchor. */
export const toggleKey = (state: SelectionState, key: string): SelectionState => ({
  anchor: key,
  keys: state.keys.includes(key)
    ? state.keys.filter((other) => other !== key)
    : [...state.keys, key],
});

/**
 * Ticks every row from the anchor to `key`, both included, in the order the rows are on screen,
 * and keeps what was already ticked. Without an anchor on screen it ticks `key` alone, because
 * there is no other end to the range.
 */
export const selectRangeTo = (
  state: SelectionState,
  rowKeys: readonly string[],
  key: string
): SelectionState => {
  const targetIndex = rowKeys.indexOf(key);
  const anchorIndex = state.anchor === null ? -1 : rowKeys.indexOf(state.anchor);
  if (targetIndex === -1) {
    return state;
  }
  const [from, to] =
    anchorIndex === -1
      ? [targetIndex, targetIndex]
      : [Math.min(anchorIndex, targetIndex), Math.max(anchorIndex, targetIndex)];
  const inRange = rowKeys.slice(from, to + 1);
  const known = new Set(state.keys);

  return { anchor: key, keys: [...state.keys, ...inRange.filter((other) => !known.has(other))] };
};

/** What the header checkbox shows, counted over the rows loaded and on screen only. */
export const headerCheckboxStateOf = (
  state: SelectionState,
  rowKeys: readonly string[]
): HeaderCheckboxState => {
  if (rowKeys.length === 0) {
    return "none";
  }
  const ticked = new Set(state.keys);
  const count = rowKeys.filter((key) => ticked.has(key)).length;
  if (count === 0) {
    return "none";
  }

  return count === rowKeys.length ? "all" : "some";
};

/**
 * The header checkbox: ticks every loaded row, or clears the selection when every loaded row is
 * already ticked. Rows that are not loaded (a folder with more to load, a closed folder) are never
 * touched, because the editor has not seen them.
 */
export const toggleAllKeys = (
  state: SelectionState,
  rowKeys: readonly string[]
): SelectionState => {
  if (headerCheckboxStateOf(state, rowKeys) === "all") {
    return emptySelection;
  }
  const known = new Set(state.keys);

  return {
    anchor: state.anchor,
    keys: [...state.keys, ...rowKeys.filter((key) => !known.has(key))],
  };
};

/** Drops what is no longer on screen (a folder was closed, a row moved away or was deleted). */
export const pruneKeys = (state: SelectionState, rowKeys: readonly string[]): SelectionState => {
  const onScreen = new Set(rowKeys);
  const keys = state.keys.filter((key) => onScreen.has(key));
  const anchor = state.anchor !== null && onScreen.has(state.anchor) ? state.anchor : null;
  if (keys.length === state.keys.length && anchor === state.anchor) {
    return state;
  }

  return { anchor, keys };
};

/** Ticks exactly these rows and nothing else, with no anchor: a selection put back after a failure. */
export const selectOnly = (keys: readonly string[]): SelectionState => ({
  anchor: null,
  keys: [...new Set(keys)],
});

/** The rows that are ticked, in the order they are on screen. */
export const selectedItemsOf = (state: SelectionState, items: readonly TreeItem[]): TreeItem[] => {
  const ticked = new Set(state.keys);

  return items.filter((item) => ticked.has(itemKeyOf(item)));
};

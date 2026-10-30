import { useModal } from "@payloadcms/ui";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { TreeItem } from "../../types.js";
import { rootsOfSelection } from "../Move/moveFlow.js";
import { itemKeyOf, loadedItemsOf } from "../store.js";
import type { TreeStoreState } from "../store.js";

type ActiveMoveMode = {
  /** The rows as they were when Move mode began; the live rows replace them while they are loaded. */
  items: readonly TreeItem[];
  /** The moving rows are exactly the ticked ones, so a refused move puts those ticks back. */
  isSelection: boolean;
};

export type MoveModeApi = {
  active: boolean;
  enter: (items: readonly TreeItem[], isSelection: boolean) => void;
  exit: () => void;
  /** The rows being moved, nested ones already left out: a folder takes its contents along. */
  moving: readonly TreeItem[];
  /** The moving rows are the ticked ones. */
  movesSelection: boolean;
};

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) &&
  // A checkbox is an input too, and the keys still belong to the tree there.
  !(target instanceof HTMLInputElement && target.type === "checkbox");

/**
 * One of the plugin's menus is open: Escape belongs to it. Payload keeps closed menus of its own in
 * the page, so this looks for the plugin's class, not for the menu role.
 */
const isMenuOpen = (): boolean => document.querySelector(".fr-folders-menu") !== null;

/**
 * Move mode (spec section 7.4): the rows being moved, and the two keys that start and end it. `M`
 * starts it for the ticked rows, Escape leaves it. Neither works while a dialog, a menu or a text
 * field has the keyboard, or while a move is in flight (`isBusy`), because a second move would be
 * dropped.
 */
export const useMoveMode = ({
  isBusy,
  selectedItems,
  state,
}: {
  isBusy: boolean;
  selectedItems: readonly TreeItem[];
  state: TreeStoreState;
}): MoveModeApi => {
  const [mode, setMode] = useState<ActiveMoveMode | null>(null);
  const { modalState } = useModal();
  const isModalOpen = Object.values(modalState).some((modal) => modal.isOpen);

  const enter = useCallback((items: readonly TreeItem[], isSelection: boolean) => {
    if (rootsOfSelection(items).length > 0) {
      setMode({ isSelection, items });
    }
  }, []);
  const exit = useCallback(() => setMode(null), []);

  // The rows as the store has them now, so an order key or a folder that changed under Move mode
  // does not send a stale `expected`; a row whose folder was never loaded keeps its first reading.
  const moving = useMemo(() => {
    if (mode === null) {
      return [];
    }
    const loaded = new Map(loadedItemsOf(state).map((item) => [itemKeyOf(item), item]));

    return rootsOfSelection(mode.items.map((item) => loaded.get(itemKeyOf(item)) ?? item));
  }, [mode, state]);

  const isActive = mode !== null;
  const hasSelection = selectedItems.length > 0;
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isModalOpen || isMenuOpen() || isTyping(event.target)) {
        return;
      }
      if (event.key === "Escape" && isActive) {
        event.preventDefault();
        setMode(null);

        return;
      }
      const isPlainM =
        (event.key === "m" || event.key === "M") &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey;
      if (isPlainM && !isActive && hasSelection && !isBusy) {
        event.preventDefault();
        setMode({ isSelection: true, items: selectedItems });
      }
    };
    document.addEventListener("keydown", handleKey);

    return () => document.removeEventListener("keydown", handleKey);
  }, [hasSelection, isActive, isBusy, isModalOpen, selectedItems]);

  // The keyboard picks the target, so the first marker that can take the rows has the focus.
  useEffect(() => {
    if (isActive) {
      document
        .querySelector<HTMLElement>('[data-testid="move-marker"]:not([aria-disabled="true"])')
        ?.focus();
    }
  }, [isActive]);

  // Left alone when the rows it was for are gone, say the last of them was deleted elsewhere.
  useEffect(() => {
    if (isActive && moving.length === 0) {
      setMode(null);
    }
  }, [isActive, moving.length]);

  return {
    active: isActive,
    enter,
    exit,
    moving,
    movesSelection: mode?.isSelection ?? false,
  };
};

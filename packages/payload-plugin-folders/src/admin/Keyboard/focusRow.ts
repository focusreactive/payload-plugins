import type { ItemRef } from "../../types.js";

/**
 * The DOM row of an item, in `root` (a tree's own element: the tree view and the sidebar tab can
 * be on the page together, each with a row for the same item) or anywhere on the page.
 */
export const rowElementOf = (
  item: ItemRef,
  root: ParentNode | null = document
): HTMLElement | null =>
  (root ?? document).querySelector<HTMLElement>(
    `[data-testid="tree-row"][data-collection="${item.collection}"][data-item-id="${item.id}"]`
  );

/** The key a DOM row stands for, the same as `itemKeyOf` of its item. */
export const rowKeyOfElement = (element: Element | null): string | null => {
  const row = element?.closest('[data-testid="tree-row"]');
  const collection = row?.getAttribute("data-collection");
  const id = row?.getAttribute("data-item-id");

  return collection && id ? `${collection}:${id}` : null;
};

/** A dialog has the keyboard: it keeps the focus until it closes. */
export const isDialogOpen = (): boolean =>
  document.querySelector(".payload__modal-item--open") !== null;

/** One of the plugin's menus is open: its keys are its own. */
export const isMenuOpen = (): boolean => document.querySelector(".fr-folders-menu") !== null;

/** Nothing in particular has the focus: the element that had it left the page. */
export const hasLostFocus = (): boolean =>
  document.activeElement === null || document.activeElement === document.body;

const pollMs = 50;
const giveUpMs = 3000;

/**
 * Puts the focus on a row that is not on screen yet (a folder was just opened, a search just
 * ended, a long list was scrolled to it): looks every 50 ms for up to 3 seconds, and waits out a
 * dialog instead of taking the focus from it. `getRoot` names the tree to look in, and
 * `isStillWanted` lets the caller give up when the focus has gone somewhere else meanwhile.
 * Returns a function that stops looking.
 */
export const focusRowWhenShown = (
  item: ItemRef,
  getRoot: () => ParentNode | null = () => document,
  isStillWanted: () => boolean = () => true
): (() => void) => {
  const deadline = Date.now() + giveUpMs;
  const timer = setInterval(() => {
    if (Date.now() > deadline) {
      clearInterval(timer);

      return;
    }
    if (isDialogOpen()) {
      return;
    }
    if (!isStillWanted()) {
      clearInterval(timer);

      return;
    }
    const row = rowElementOf(item, getRoot());
    if (row) {
      clearInterval(timer);
      row.focus();
    }
  }, pollMs);

  return () => clearInterval(timer);
};

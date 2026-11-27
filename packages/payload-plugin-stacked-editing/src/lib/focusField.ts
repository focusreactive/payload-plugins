import { FLASH_CLASS, OWNER_ATTRIBUTE, PANEL_BODY_CLASS } from "./constants.js";
import { fieldDomIdOf } from "./domPath.js";

const FOCUSABLE = '[data-lexical-editor="true"], input:not([type="hidden"]), textarea, select';
// An upload or relationship field with a value has no input, only its buttons.
const FOCUSABLE_CONTROL = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
const POLL_MS = 60;
// The first panel of a page can take a few seconds to render on a slow machine or a cold dev server.
const BUDGET_MS = 10_000;
const FLASH_MS = 1800;
const REFOCUS_MS = 400;
const HOLD_FOCUS_MS = 1500;
const USER_INPUT_EVENTS = ["pointerdown", "keydown"] as const;

const restartAnimation = (element: HTMLElement, className: string) => {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
};

const fieldInTopPanel = (ownerId: string, path: string, depth: number): HTMLElement | null => {
  const bodies = document.querySelectorAll<HTMLElement>(
    `.${PANEL_BODY_CLASS}[${OWNER_ATTRIBUTE}="${ownerId}"]`
  );
  const top = bodies.item(bodies.length - 1);
  if (bodies.length < depth || !top) {
    return null;
  }
  return (
    top.querySelector<HTMLElement>(`#${CSS.escape(fieldDomIdOf(path))}`) ??
    top.querySelector<HTMLElement>(`[data-field-path="${CSS.escape(path)}"]`)
  );
};

const focusableIn = (field: HTMLElement): HTMLElement | null =>
  field.matches(FOCUSABLE)
    ? field
    : (field.querySelector<HTMLElement>(FOCUSABLE) ??
      field.querySelector<HTMLElement>(FOCUSABLE_CONTROL));

// A panel's fields are in the DOM before its drawer is shown, and `focus()` on a hidden input does nothing.
export const isShown = (element: HTMLElement): boolean =>
  typeof element.checkVisibility === "function"
    ? element.checkVisibility({ visibilityProperty: true })
    : element.getClientRects().length > 0;

/**
 * Keeps focus on the field for a moment. The panel's drawer traps focus and moves it to its first
 * field when it opens, and the preview iframe that was clicked can take focus back once its click
 * finishes. Neither is the editor's choice, so focus returns to the field until the editor clicks
 * or types.
 */
export const holdFocus = (focusable: HTMLElement, holdMs = HOLD_FOCUS_MS): (() => void) => {
  let userActed = false;
  const onUserInput = () => {
    userActed = true;
  };
  const restore = () => {
    if (!userActed && focusable.isConnected && document.activeElement !== focusable) {
      focusable.focus({ preventScroll: true });
    }
  };
  for (const type of USER_INPUT_EVENTS) {
    document.addEventListener(type, onUserInput, true);
  }
  document.addEventListener("focusin", restore);
  const recheck = window.setTimeout(restore, REFOCUS_MS);
  let release = 0;
  const stop = () => {
    window.clearTimeout(recheck);
    window.clearTimeout(release);
    document.removeEventListener("focusin", restore);
    for (const type of USER_INPUT_EVENTS) {
      document.removeEventListener(type, onUserInput, true);
    }
  };
  release = window.setTimeout(stop, holdMs);
  return stop;
};

const revealAndFlash = (field: HTMLElement): (() => void) => {
  field.scrollIntoView({ behavior: "smooth", block: "center" });
  const focusable = focusableIn(field);
  let releaseFocus: (() => void) | undefined;
  if (focusable) {
    focusable.focus({ preventScroll: true });
    releaseFocus = holdFocus(focusable);
  }
  restartAnimation(field, FLASH_CLASS);
  const unflash = window.setTimeout(() => field.classList.remove(FLASH_CLASS), FLASH_MS);
  return () => {
    releaseFocus?.();
    window.clearTimeout(unflash);
  };
};

export const focusFieldInTopPanel = ({
  depth,
  ownerId,
  path,
}: {
  depth: number;
  ownerId: string;
  path: string;
}): (() => void) => {
  const startedAt = Date.now();
  let timer = 0;
  let cancelReveal: (() => void) | undefined;
  const waitForField = () => {
    const field = fieldInTopPanel(ownerId, path, depth);
    if (field && isShown(field)) {
      cancelReveal = revealAndFlash(field);
    } else if (Date.now() - startedAt < BUDGET_MS) {
      timer = window.setTimeout(waitForField, POLL_MS);
    }
  };
  timer = window.setTimeout(waitForField, POLL_MS);
  return () => {
    window.clearTimeout(timer);
    cancelReveal?.();
  };
};

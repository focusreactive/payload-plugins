import { FLASH_CLASS, OWNER_ATTRIBUTE, PANEL_BODY_CLASS } from "./constants.js";
import { fieldDomIdOf } from "./domPath.js";

const FOCUSABLE = '[data-lexical-editor="true"], input:not([type="hidden"]), textarea, select';
const POLL_MS = 60;
const BUDGET_MS = 3000;
const FLASH_MS = 1800;
const REFOCUS_MS = 400;

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
  field.matches(FOCUSABLE) ? field : field.querySelector<HTMLElement>(FOCUSABLE);

const isFocusTakenFrom = (focusable: HTMLElement, active: Element | null) =>
  active !== null &&
  active !== focusable &&
  (active === document.body ||
    active.tagName === "IFRAME" ||
    active.closest(`.${PANEL_BODY_CLASS}`) !== null);

const refocusIfTakenAway = (focusable: HTMLElement) =>
  window.setTimeout(() => {
    if (isFocusTakenFrom(focusable, document.activeElement)) {
      focusable.focus({ preventScroll: true });
    }
  }, REFOCUS_MS);

const revealAndFlash = (field: HTMLElement): number => {
  field.scrollIntoView({ behavior: "smooth", block: "center" });
  const focusable = focusableIn(field);
  if (focusable) {
    focusable.focus({ preventScroll: true });
    refocusIfTakenAway(focusable);
  }
  restartAnimation(field, FLASH_CLASS);
  return window.setTimeout(() => field.classList.remove(FLASH_CLASS), FLASH_MS);
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
  const waitForField = () => {
    const field = fieldInTopPanel(ownerId, path, depth);
    if (field) {
      timer = revealAndFlash(field);
    } else if (Date.now() - startedAt < BUDGET_MS) {
      timer = window.setTimeout(waitForField, POLL_MS);
    }
  };
  timer = window.setTimeout(waitForField, POLL_MS);
  return () => window.clearTimeout(timer);
};

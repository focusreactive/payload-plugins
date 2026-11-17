import { fieldDomIdOf } from "../lib/domPath.js";
import { FLASH_CLASS, OWNER_ATTRIBUTE } from "./styles.js";

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
    `.stacked-editing__body[${OWNER_ATTRIBUTE}="${ownerId}"]`
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

export const focusFieldInTopPanel = ({
  depth,
  ownerId,
  path,
}: {
  depth: number;
  ownerId: string;
  path: string;
}): (() => void) => {
  const started = Date.now();
  let timer = 0;
  const attempt = () => {
    const field = fieldInTopPanel(ownerId, path, depth);
    if (!field) {
      if (Date.now() - started < BUDGET_MS) {
        timer = window.setTimeout(attempt, POLL_MS);
      }
      return;
    }
    field.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusable = field.matches(FOCUSABLE)
      ? field
      : field.querySelector<HTMLElement>(FOCUSABLE);
    focusable?.focus({ preventScroll: true });
    // The preview iframe that was clicked can take focus back once its click finishes.
    window.setTimeout(() => {
      const active = document.activeElement;
      if (
        focusable &&
        active !== focusable &&
        (active === document.body || active?.tagName === "IFRAME")
      ) {
        focusable.focus({ preventScroll: true });
      }
    }, REFOCUS_MS);
    restartAnimation(field, FLASH_CLASS);
    timer = window.setTimeout(() => field.classList.remove(FLASH_CLASS), FLASH_MS);
  };
  timer = window.setTimeout(attempt, POLL_MS);
  return () => window.clearTimeout(timer);
};

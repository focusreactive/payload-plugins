import { fieldDomIdOf } from "../lib/domPath.js";
import { FLASH_CLASS, OWNER_ATTRIBUTE } from "./styles.js";

const FOCUSABLE = '[data-lexical-editor="true"], input:not([type="hidden"]), textarea, select';
const POLL_MS = 60;
const BUDGET_MS = 3000;
const FLASH_MS = 1800;
const REFOCUS_MS = 400;

/** The field's element inside the top (last opened) panel of this instance, once it rendered. */
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

/**
 * Once the panels down to a field have opened: scroll the field into view in the top panel, focus
 * its input and flash a highlight ring around it (the same cue the visual-editing bridge uses).
 */
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
    // The click that started this happened in the preview iframe, which may take focus back once
    // the click finishes; claim it again for the field.
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
    field.classList.remove(FLASH_CLASS);
    // Restart the animation when the same field is opened twice in a row.
    void field.offsetWidth;
    field.classList.add(FLASH_CLASS);
    timer = window.setTimeout(() => field.classList.remove(FLASH_CLASS), FLASH_MS);
  };
  timer = window.setTimeout(attempt, POLL_MS);
  return () => window.clearTimeout(timer);
};

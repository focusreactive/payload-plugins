import type { ContainerInstruction } from "./resolveContainerChain.js";

import {
  arrayFieldIdOfRow,
  FIELD_ID_PREFIX,
  FIELD_ID_SEPARATOR,
  fieldDomIdOf,
} from "./fieldDomId.js";

const FOCUS_SELECTOR = '[data-lexical-editor="true"], input:not([type="hidden"]), textarea';

const FIELD_WRAPPER_SELECTOR = ".field-type";
const BLOCK_NAME_INPUT_SELECTOR = ".section-title__input";
const FOCUSED_FIELD_FRAME_SELECTOR = ".section-title, .field-type";

const REVEAL_STYLE_ID = "ve-reveal-styles";
// An attribute, not a class: React rewrites `className` when a focused field re-renders.
const REVEAL_ATTR = "data-ve-reveal";
const POLL_INTERVAL_MS = 60;
const STEP_BUDGET_MS = 1500;
const POST_SCROLL_DELAY_MS = 500;

/** How long the field keeps the accent border before it settles into Payload's own focus style. */
const REVEAL_TOTAL_MS = 1600;

// The reveal restyles the field's own frame, so it reads as Payload's focus state turned up:
// the border takes the admin's blue and a soft ring pulses out of it twice. Fields without a
// border of their own (the Lexical editor) get the same ring drawn with a box-shadow.
// The doubled selector outranks react-select's emotion styles, which are not in a cascade layer.
const REVEAL_STYLES = `
@keyframes ve-field-reveal-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(21, 135, 186, 0.45); }
  70%  { box-shadow: 0 0 0 5px rgba(21, 135, 186, 0); }
  100% { box-shadow: 0 0 0 0 rgba(21, 135, 186, 0); }
}
@keyframes ve-field-reveal-ring {
  0%   { box-shadow: 0 0 0 1px var(--color-blue-500, rgb(21, 135, 186)), 0 0 0 1px rgba(21, 135, 186, 0.45); }
  70%  { box-shadow: 0 0 0 1px var(--color-blue-500, rgb(21, 135, 186)), 0 0 0 6px rgba(21, 135, 186, 0); }
  100% { box-shadow: 0 0 0 1px var(--color-blue-500, rgb(21, 135, 186)), 0 0 0 1px rgba(21, 135, 186, 0); }
}
[${REVEAL_ATTR}][${REVEAL_ATTR}] {
  border-color: var(--color-blue-500, rgb(21, 135, 186));
  animation: ve-field-reveal-pulse 750ms cubic-bezier(0.2, 0, 0.2, 1) 2;
}
[${REVEAL_ATTR}="ring"][${REVEAL_ATTR}="ring"] {
  border-radius: var(--style-radius-s, 3px);
  box-shadow: 0 0 0 1px var(--color-blue-500, rgb(21, 135, 186));
  animation-name: ve-field-reveal-ring;
}
@media (prefers-reduced-motion: reduce) {
  [${REVEAL_ATTR}][${REVEAL_ATTR}] { animation: none; }
}
`;

const ensureRevealStyles = (): void => {
  // oxlint-disable-next-line unicorn/prefer-query-selector -- ids are not guaranteed to be valid CSS selectors
  if (document.getElementById(REVEAL_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = REVEAL_STYLE_ID;
  style.textContent = REVEAL_STYLES;
  document.head.append(style);
};

const hasOwnBorder = (el: HTMLElement): boolean => {
  const style = getComputedStyle(el);
  return (
    Number.parseFloat(style.borderTopWidth) >= 1 && Number.parseFloat(style.borderLeftWidth) >= 1
  );
};

/**
 * The element that draws the field's box: the input itself, react-select's control, the
 * stepper group around a number. Walks up from the focused element, staying inside the field.
 */
const frameOf = (focused: HTMLElement): HTMLElement | null => {
  const field = focused.closest<HTMLElement>(FOCUSED_FIELD_FRAME_SELECTOR);
  for (let el: HTMLElement | null = focused; el && el !== field; el = el.parentElement) {
    if (hasOwnBorder(el)) return el;
  }
  return null;
};

const revealTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

const revealField = (focused: HTMLElement): void => {
  ensureRevealStyles();
  const frame = frameOf(focused);
  const target = frame ?? focused;
  const previous = revealTimers.get(target);
  if (previous) clearTimeout(previous);
  target.removeAttribute(REVEAL_ATTR);
  // Restart the animation when the same field is revealed twice in a row.
  void target.offsetWidth;
  target.setAttribute(REVEAL_ATTR, frame ? "border" : "ring");
  revealTimers.set(
    target,
    setTimeout(() => {
      target.removeAttribute(REVEAL_ATTR);
      revealTimers.delete(target);
    }, REVEAL_TOTAL_MS)
  );
};

const blockNameInputOf = (fieldId: string): HTMLElement | null => {
  const inputs = document.querySelectorAll<HTMLInputElement>(BLOCK_NAME_INPUT_SELECTOR);
  return Array.from(inputs).find((input) => fieldDomIdOf(input.name) === fieldId) ?? null;
};

const labelOf = (fieldId: string): HTMLLabelElement | null =>
  Array.from(document.querySelectorAll("label")).find((label) => label.htmlFor === fieldId) ?? null;

export const findFieldElement = (fieldId: string): HTMLElement | null => {
  // oxlint-disable-next-line unicorn/prefer-query-selector -- ids are not guaranteed to be valid CSS selectors
  const direct = document.getElementById(fieldId);
  if (direct) return direct;
  const wrapper = labelOf(fieldId)?.closest<HTMLElement>(FIELD_WRAPPER_SELECTOR);
  return wrapper ?? blockNameInputOf(fieldId);
};

export const scrollNearestAncestorIntoView = (fieldId: string): void => {
  if (!fieldId.startsWith(FIELD_ID_PREFIX)) return;
  const segments = fieldId.slice(FIELD_ID_PREFIX.length).split(FIELD_ID_SEPARATOR);
  for (let i = segments.length; i > 0; i--) {
    const ancestorId = `${FIELD_ID_PREFIX}${segments.slice(0, i).join(FIELD_ID_SEPARATOR)}`;
    // oxlint-disable-next-line unicorn/prefer-query-selector -- ids are not guaranteed to be valid CSS selectors
    const el = document.getElementById(ancestorId);
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "auto", block: "center" });
      return;
    }
  }
};

const waitFor = (predicate: () => boolean, budgetMs: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const deadline = Date.now() + budgetMs;
    const tick = () => {
      if (predicate()) return resolve(true);
      if (Date.now() >= deadline) return resolve(false);
      setTimeout(tick, POLL_INTERVAL_MS);
    };
    tick();
  });
};

const collapsibleDomId = (path: string): string => fieldDomIdOf(`collapsible-${path}`);

const runInstruction = async (
  instruction: ContainerInstruction,
  scope: ParentNode
): Promise<{ ok: boolean; nextScope: ParentNode }> => {
  switch (instruction.kind) {
    case "tab": {
      const getButton = (): HTMLButtonElement | null => {
        const buttons = scope.querySelectorAll<HTMLButtonElement>(".tabs-field__tab-button");
        return buttons[instruction.tabIndex] ?? null;
      };
      const isActive = () =>
        getButton()?.classList.contains("tabs-field__tab-button--active") ?? false;

      const ready = await waitFor(() => getButton() !== null, STEP_BUDGET_MS);
      if (!ready) return { ok: false, nextScope: scope };
      if (!isActive()) getButton()!.click();
      const activated = await waitFor(isActive, STEP_BUDGET_MS);
      return { ok: activated, nextScope: scope };
    }
    case "collapsible": {
      const id = collapsibleDomId(instruction.path);
      // oxlint-disable-next-line unicorn/prefer-query-selector -- ids are not guaranteed to be valid CSS selectors
      const ready = await waitFor(() => document.getElementById(id) !== null, STEP_BUDGET_MS);
      if (!ready) return { ok: false, nextScope: scope };
      // oxlint-disable-next-line unicorn/prefer-query-selector -- ids are not guaranteed to be valid CSS selectors
      const wrapper = document.getElementById(id)!;
      const toggle = wrapper.querySelector<HTMLButtonElement>(".collapsible__toggle");
      if (!toggle) return { ok: true, nextScope: wrapper };
      if (toggle.classList.contains("collapsible__toggle--collapsed")) {
        toggle.click();
        const opened = await waitFor(
          () => !toggle.classList.contains("collapsible__toggle--collapsed"),
          STEP_BUDGET_MS
        );
        return { ok: opened, nextScope: wrapper };
      }
      return { ok: true, nextScope: wrapper };
    }
    case "row": {
      scrollNearestAncestorIntoView(arrayFieldIdOfRow(instruction.rowContainerId));
      const ready = await waitFor(
        // oxlint-disable-next-line unicorn/prefer-query-selector -- ids are not guaranteed to be valid CSS selectors
        () => document.getElementById(instruction.rowContainerId) !== null,
        STEP_BUDGET_MS
      );
      if (!ready) return { ok: false, nextScope: scope };
      // oxlint-disable-next-line unicorn/prefer-query-selector -- ids are not guaranteed to be valid CSS selectors
      const row = document.getElementById(instruction.rowContainerId)!;
      const toggle = row.querySelector<HTMLButtonElement>(".collapsible__toggle");
      if (!toggle) return { ok: true, nextScope: row };
      if (toggle.classList.contains("collapsible__toggle--collapsed")) {
        toggle.click();
        const opened = await waitFor(
          () => !toggle.classList.contains("collapsible__toggle--collapsed"),
          STEP_BUDGET_MS
        );
        return { ok: opened, nextScope: row };
      }
      return { ok: true, nextScope: row };
    }
  }
};

export const applyContainerChain = async (
  chain: readonly ContainerInstruction[]
): Promise<boolean> => {
  let scope: ParentNode = document;
  for (const instruction of chain) {
    const result = await runInstruction(instruction, scope);
    if (!result.ok) return false;
    scope = result.nextScope;
  }
  return true;
};

const focusAndReveal = (fieldEl: HTMLElement): void => {
  if (typeof fieldEl.scrollIntoView === "function") {
    fieldEl.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  setTimeout(() => {
    const focusable = fieldEl.matches(FOCUS_SELECTOR)
      ? fieldEl
      : fieldEl.querySelector<HTMLElement>(FOCUS_SELECTOR);
    focusable?.focus({ preventScroll: true });
    if (typeof fieldEl.scrollIntoView === "function") {
      const rect = fieldEl.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const outOfView = rect.bottom <= 0 || rect.top >= viewportHeight;
      if (outOfView) {
        fieldEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    revealField(focusable ?? fieldEl);
  }, POST_SCROLL_DELAY_MS);
};

export const expandAndFocus = async (
  chain: readonly ContainerInstruction[],
  fieldId: string | null
): Promise<void> => {
  await applyContainerChain(chain);
  if (!fieldId) return;
  scrollNearestAncestorIntoView(fieldId);
  const ready = await waitFor(() => findFieldElement(fieldId) !== null, STEP_BUDGET_MS);
  if (!ready) return;
  const fieldEl = findFieldElement(fieldId);
  if (fieldEl) focusAndReveal(fieldEl);
};

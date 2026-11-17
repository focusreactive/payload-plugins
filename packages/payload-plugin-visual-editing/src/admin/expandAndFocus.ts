import type { ContainerInstruction } from "./resolveContainerChain.js";

import {
  arrayFieldIdOfRow,
  FIELD_ID_PREFIX,
  FIELD_ID_SEPARATOR,
  fieldDomIdOf,
} from "./fieldDomId.js";

const RICH_TEXT_EDITOR_SELECTOR = '[data-lexical-editor="true"]';
const FOCUS_SELECTOR = `${RICH_TEXT_EDITOR_SELECTOR}, input:not([type="hidden"]), textarea`;
const RICH_TEXT_FIELD_SELECTOR = ".rich-text-lexical";

const FIELD_WRAPPER_SELECTOR = ".field-type";
const BLOCK_NAME_INPUT_SELECTOR = ".section-title__input";
const FOCUSED_FIELD_FRAME_SELECTOR = ".section-title, .field-type";

const REVEAL_STYLE_ID = "ve-reveal-styles";
// An attribute, not a class: React rewrites `className` when a focused field re-renders.
const REVEAL_ATTR = "data-ve-reveal";
const POLL_INTERVAL_MS = 20;
export const WALK_BUDGET_MS = 20_000;
const POST_SCROLL_DELAY_MS = 500;
const DOCUMENT_HEADER_SELECTOR = ".doc-controls";

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

const nearestRenderedAncestorOf = (fieldId: string): HTMLElement | null => {
  if (!fieldId.startsWith(FIELD_ID_PREFIX)) return null;
  const segments = fieldId.slice(FIELD_ID_PREFIX.length).split(FIELD_ID_SEPARATOR);
  for (let i = segments.length; i > 0; i--) {
    const ancestorId = `${FIELD_ID_PREFIX}${segments.slice(0, i).join(FIELD_ID_SEPARATOR)}`;
    // oxlint-disable-next-line unicorn/prefer-query-selector -- ids are not guaranteed to be valid CSS selectors
    const el = document.getElementById(ancestorId);
    if (el) return el;
  }
  return null;
};

const scrollIntoViewAtOnce = (el: HTMLElement | null): void => {
  if (el && typeof el.scrollIntoView === "function") {
    el.scrollIntoView({ behavior: "auto", block: "center" });
  }
};

const isOutOfView = (el: HTMLElement): boolean => {
  const rect = el.getBoundingClientRect();
  return rect.bottom <= 0 || rect.top >= window.innerHeight;
};

const isWhollyInView = (el: HTMLElement): boolean => {
  const rect = el.getBoundingClientRect();
  const header = document.querySelector<HTMLElement>(DOCUMENT_HEADER_SELECTOR);
  const top = header?.getBoundingClientRect().bottom ?? 0;
  return rect.height > 0 && rect.top >= top && rect.bottom <= window.innerHeight;
};

export const scrollNearestAncestorIntoView = (fieldId: string): void =>
  scrollIntoViewAtOnce(nearestRenderedAncestorOf(fieldId));

const nearestRenderedContainerOf = (fieldId: string, scope: ParentNode): HTMLElement | null => {
  const ancestor = nearestRenderedAncestorOf(fieldId);
  if (!(scope instanceof HTMLElement)) return ancestor;
  return !ancestor || ancestor.contains(scope) ? scope : ancestor;
};

type Walk = { isOver: () => boolean };

let latestWalk = 0;

const startWalk = (budgetMs: number): Walk => {
  latestWalk += 1;
  const walk = latestWalk;
  const deadline = Date.now() + budgetMs;
  return { isOver: () => walk !== latestWalk || Date.now() >= deadline };
};

const waitFor = (predicate: () => boolean, walk: Walk): Promise<boolean> =>
  new Promise((resolve) => {
    const tick = () => {
      if (predicate()) return resolve(true);
      if (walk.isOver()) return resolve(false);
      setTimeout(tick, POLL_INTERVAL_MS);
    };
    tick();
  });

const waitForRendered = <Found extends HTMLElement>(
  find: () => Found | null,
  fieldId: string,
  scope: ParentNode,
  walk: Walk
): Promise<Found | null> => {
  let scrolledTo: HTMLElement | null = null;
  const isRendered = (): boolean => {
    if (find() !== null) return true;
    const container = nearestRenderedContainerOf(fieldId, scope);
    const isPushedOutOfView = container !== null && isOutOfView(container);
    if (container !== scrolledTo || isPushedOutOfView) scrollIntoViewAtOnce(container);
    scrolledTo = container;
    return false;
  };
  return waitFor(isRendered, walk).then((rendered) => (rendered ? find() : null));
};

const pause = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const collapsibleDomId = (path: string): string => fieldDomIdOf(`collapsible-${path}`);

const TOGGLE_SELECTOR = ".collapsible__toggle";
const COLLAPSED_TOGGLE_CLASS = "collapsible__toggle--collapsed";

const expand = async (container: HTMLElement, walk: Walk): Promise<boolean> => {
  const toggle = container.querySelector<HTMLButtonElement>(TOGGLE_SELECTOR);
  if (!toggle?.classList.contains(COLLAPSED_TOGGLE_CLASS)) return true;
  toggle.click();
  return waitFor(() => !toggle.classList.contains(COLLAPSED_TOGGLE_CLASS), walk);
};

const runInstruction = async (
  instruction: ContainerInstruction,
  scope: ParentNode,
  walk: Walk
): Promise<{ ok: boolean; nextScope: ParentNode }> => {
  switch (instruction.kind) {
    case "tab": {
      const getButton = (): HTMLButtonElement | null => {
        const buttons = scope.querySelectorAll<HTMLButtonElement>(".tabs-field__tab-button");
        return buttons[instruction.tabIndex] ?? null;
      };
      const isActive = () =>
        getButton()?.classList.contains("tabs-field__tab-button--active") ?? false;

      const ready = await waitFor(() => getButton() !== null, walk);
      if (!ready) return { ok: false, nextScope: scope };
      if (!isActive()) getButton()?.click();
      const activated = await waitFor(isActive, walk);
      return { ok: activated, nextScope: scope };
    }
    case "collapsible": {
      const id = collapsibleDomId(instruction.path);
      // oxlint-disable-next-line unicorn/prefer-query-selector -- ids are not guaranteed to be valid CSS selectors
      const wrapper = await waitForRendered(() => document.getElementById(id), id, scope, walk);
      if (!wrapper) return { ok: false, nextScope: scope };
      return { ok: await expand(wrapper, walk), nextScope: wrapper };
    }
    case "row": {
      const row = await waitForRendered(
        // oxlint-disable-next-line unicorn/prefer-query-selector -- ids are not guaranteed to be valid CSS selectors
        () => document.getElementById(instruction.rowContainerId),
        arrayFieldIdOfRow(instruction.rowContainerId),
        scope,
        walk
      );
      if (!row) return { ok: false, nextScope: scope };
      return { ok: await expand(row, walk), nextScope: row };
    }
  }
};

type WalkedChain = { ok: boolean; scope: ParentNode };

const walkContainerChain = async (
  chain: readonly ContainerInstruction[],
  walk: Walk
): Promise<WalkedChain> => {
  let scope: ParentNode = document;
  for (const instruction of chain) {
    const result = await runInstruction(instruction, scope, walk);
    if (!result.ok) return { ok: false, scope };
    scope = result.nextScope;
  }
  return { ok: true, scope };
};

export const applyContainerChain = async (
  chain: readonly ContainerInstruction[]
): Promise<boolean> => {
  const { ok } = await walkContainerChain(chain, startWalk(WALK_BUDGET_MS));
  return ok;
};

const focusableOf = async (fieldEl: HTMLElement, walk: Walk): Promise<HTMLElement | null> => {
  if (fieldEl.matches(FOCUS_SELECTOR)) return fieldEl;
  if (!fieldEl.matches(RICH_TEXT_FIELD_SELECTOR)) {
    return fieldEl.querySelector<HTMLElement>(FOCUS_SELECTOR);
  }
  const editorOf = () => fieldEl.querySelector<HTMLElement>(RICH_TEXT_EDITOR_SELECTOR);
  await waitFor(() => editorOf() !== null, walk);
  return editorOf();
};

const scrollSmoothlyIntoView = (el: HTMLElement): void => {
  if (typeof el.scrollIntoView === "function") {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
};

const focusAndReveal = async (fieldEl: HTMLElement, walk: Walk): Promise<void> => {
  if (!isWhollyInView(fieldEl)) {
    scrollSmoothlyIntoView(fieldEl);
    await pause(POST_SCROLL_DELAY_MS);
  }

  const focusable = await focusableOf(fieldEl, walk);
  focusable?.focus({ preventScroll: true });
  if (isOutOfView(fieldEl)) scrollSmoothlyIntoView(fieldEl);

  revealField(focusable ?? fieldEl);
};

export const expandAndFocus = async (
  chain: readonly ContainerInstruction[],
  fieldId: string | null
): Promise<void> => {
  const walk = startWalk(WALK_BUDGET_MS);
  const { scope } = await walkContainerChain(chain, walk);
  if (!fieldId) return;
  const fieldEl = await waitForRendered(() => findFieldElement(fieldId), fieldId, scope, walk);
  if (fieldEl) await focusAndReveal(fieldEl, walk);
};

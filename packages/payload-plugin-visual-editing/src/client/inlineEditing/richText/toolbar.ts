import type { VeRichTextFormats } from "../../../shared/richText/formats.js";
import type { ShownFormats, ToolbarAction } from "./pageEditor.js";

import {
  BOLD_FORMAT,
  BULLET_LIST,
  ITALIC_FORMAT,
  NUMBERED_LIST,
  UNDERLINE_FORMAT,
} from "../../../shared/richText/formats.js";
import { isAllowedLinkUrl, linkUrlOf } from "../../../shared/richText/linkUrls.js";
import { DATA_VE_LAYER_ATTR } from "../../overlay/constants.js";
import { zoomOf } from "../../overlay/zoom.js";
import { DATA_VE_TOGGLE_ATTR } from "../../toggle.js";

export type ToolbarEvents = {
  onToggle(action: ToolbarAction): void;
  onLink(url: string | null): void;
  onLinkClosed(): void;
};

export interface Toolbar {
  readonly host: HTMLElement;
  readonly hasControls: boolean;
  show(formats: ShownFormats, edited: DOMRect): void;
  follow(edited: DOMRect): void;
  hide(): void;
  editLink(): void;
  isEditingLink(): boolean;
  remove(): void;
}

export const DATA_VE_RICH_TEXT_TOOLBAR_ATTR = "data-ve-rich-text-toolbar";

export const LINK_ACTION = "link";

const ACTION_ATTR = "data-action";
const PRESSED_ATTR = "aria-pressed";
const INVALID_ATTR = "aria-invalid";
const APPLY_KEY = "Enter";
const CLOSE_KEY = "Escape";
const GAP_PX = 8;
const VIEWPORT_MARGIN_PX = 8;
const LINK_PROBLEM_ID = "ve-link-problem";
const LINK_PROBLEM =
  "Use an address that starts with http:, https:, mailto: or tel:, or a relative one.";
const HIDDEN_DISPLAY = "none";
const SHOWN_DISPLAY = "block";
const OUT_OF_VIEW = "hidden";
const TOGGLES: readonly ToolbarAction[] = [
  "bold",
  "italic",
  "underline",
  "h2",
  "h3",
  "bullet",
  "number",
];

const TEMPLATE = `
<style>
  :host {
    all: initial;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 2147483647;
    box-sizing: border-box;
    max-width: calc(100vw - ${2 * VIEWPORT_MARGIN_PX}px);
    --ve-surface: #ffffff;
    --ve-border: rgba(0, 0, 0, 0.12);
    --ve-track: rgba(0, 0, 0, 0.06);
    --ve-text: #141414;
    --ve-on: var(--ve-accent, #7c3aed);
    --ve-on-text: var(--ve-accent-text, #ffffff);
    --ve-danger: #b91c1c;
  }
  @media (prefers-color-scheme: dark) {
    :host {
      --ve-surface: #222222;
      --ve-border: rgba(255, 255, 255, 0.14);
      --ve-track: rgba(255, 255, 255, 0.1);
      --ve-text: #f5f5f5;
      --ve-danger: #f87171;
    }
  }
  [role="toolbar"] {
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-sizing: border-box;
    max-width: 100%;
    padding: 4px;
    background: var(--ve-surface);
    border: 1px solid var(--ve-border);
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04), 0 8px 24px -6px rgba(0, 0, 0, 0.2);
    color: var(--ve-text);
    font: 500 13px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    white-space: nowrap;
  }
  [role="group"] {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px;
  }
  button {
    appearance: none;
    min-width: 28px;
    height: 28px;
    margin: 0;
    padding: 0 7px;
    background: transparent;
    border: 0;
    border-radius: 5px;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
  button:hover {
    background: var(--ve-track);
  }
  button[${PRESSED_ATTR}="true"] {
    background: var(--ve-on);
    color: var(--ve-on-text);
  }
  button:focus-visible, input:focus-visible {
    outline: 2px solid var(--ve-on);
    outline-offset: 1px;
  }
  [${ACTION_ATTR}="bold"] { font-weight: 700; }
  [${ACTION_ATTR}="italic"] { font-style: italic; }
  [${ACTION_ATTR}="underline"] { text-decoration: underline; }
  input {
    box-sizing: border-box;
    width: 0;
    min-width: 100%;
    flex: none;
    height: 28px;
    margin: 0;
    padding: 0 8px;
    background: var(--ve-surface);
    border: 1px solid var(--ve-border);
    border-radius: 5px;
    color: inherit;
    font: inherit;
  }
  input[${INVALID_ATTR}="true"] {
    border-color: var(--ve-danger);
  }
  [role="alert"] {
    width: 0;
    min-width: 100%;
    margin: 0;
    padding: 0 4px 2px;
    box-sizing: border-box;
    color: var(--ve-danger);
    font-weight: 500;
    line-height: 1.3;
    white-space: normal;
  }
  [hidden] {
    display: none;
  }
</style>
<div role="toolbar" aria-label="Text formatting">
  <div role="group">
    <button type="button" ${ACTION_ATTR}="bold" ${PRESSED_ATTR}="false" aria-label="Bold" title="Bold">B</button>
    <button type="button" ${ACTION_ATTR}="italic" ${PRESSED_ATTR}="false" aria-label="Italic" title="Italic">I</button>
    <button type="button" ${ACTION_ATTR}="underline" ${PRESSED_ATTR}="false" aria-label="Underline" title="Underline">U</button>
    <button type="button" ${ACTION_ATTR}="${LINK_ACTION}" ${PRESSED_ATTR}="false" aria-label="Link" title="Link">Link</button>
    <button type="button" ${ACTION_ATTR}="h2" ${PRESSED_ATTR}="false" aria-label="Heading 2" title="Heading 2">H2</button>
    <button type="button" ${ACTION_ATTR}="h3" ${PRESSED_ATTR}="false" aria-label="Heading 3" title="Heading 3">H3</button>
    <button type="button" ${ACTION_ATTR}="bullet" ${PRESSED_ATTR}="false" aria-label="Bullet list" title="Bullet list">&bull; List</button>
    <button type="button" ${ACTION_ATTR}="number" ${PRESSED_ATTR}="false" aria-label="Numbered list" title="Numbered list">1. List</button>
  </div>
  <input type="text" inputmode="url" aria-label="Link address" aria-describedby="${LINK_PROBLEM_ID}" placeholder="https://" hidden>
  <p role="alert" id="${LINK_PROBLEM_ID}" hidden></p>
</div>
`;

const allowedActionsOf = (formats: VeRichTextFormats): Record<string, boolean> => ({
  bold: (formats.textFormats & BOLD_FORMAT) !== 0,
  bullet: formats.lists.includes(BULLET_LIST),
  h2: formats.headings.includes("h2"),
  h3: formats.headings.includes("h3"),
  italic: (formats.textFormats & ITALIC_FORMAT) !== 0,
  [LINK_ACTION]: formats.hasLinks,
  number: formats.lists.includes(NUMBERED_LIST),
  underline: (formats.textFormats & UNDERLINE_FORMAT) !== 0,
});

const actionSelector = (action: string) => `[${ACTION_ATTR}="${action}"]`;

const isToggle = (action: string | null): action is ToolbarAction =>
  (TOGGLES as readonly string[]).includes(action ?? "");

const within = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max));

type Position = { left: number; top: number };

const covers = ({ left, top }: Position, { height, width }: DOMRect, toggle: DOMRect): boolean =>
  left < toggle.right &&
  left + width > toggle.left &&
  top < toggle.bottom &&
  top + height > toggle.top;

const toggleRectIn = (doc: Document): DOMRect | null =>
  doc.querySelector(`[${DATA_VE_TOGGLE_ATTR}]`)?.getBoundingClientRect() ?? null;

const positionOf = (host: HTMLElement, edited: DOMRect, win: Window): Position => {
  const size = host.getBoundingClientRect();
  const leftWithin = (left: number) =>
    within(left, VIEWPORT_MARGIN_PX, win.innerWidth - size.width - VIEWPORT_MARGIN_PX);
  const topWithin = (top: number) =>
    within(top, VIEWPORT_MARGIN_PX, win.innerHeight - size.height - VIEWPORT_MARGIN_PX);
  const topAbove = edited.top - size.height - GAP_PX;
  const isBelow =
    topAbove < VIEWPORT_MARGIN_PX &&
    edited.bottom + GAP_PX + size.height <= win.innerHeight - VIEWPORT_MARGIN_PX;
  const placed = {
    left: leftWithin(edited.left),
    top: topWithin(isBelow ? edited.bottom + GAP_PX : topAbove),
  };
  const toggle = toggleRectIn(win.document);
  if (!toggle || !covers(placed, size, toggle)) return placed;
  const beside = { ...placed, left: leftWithin(toggle.left - size.width - GAP_PX) };
  if (!covers(beside, size, toggle)) return beside;
  const edge = isBelow ? edited.bottom : edited.top;
  return { ...placed, top: topWithin(Math.max(edge, toggle.bottom) + GAP_PX) };
};

const isInView = (edited: DOMRect, win: Window): boolean =>
  edited.bottom > 0 && edited.top < win.innerHeight;

export function createToolbar(
  doc: Document,
  formats: VeRichTextFormats,
  events: ToolbarEvents
): Toolbar {
  const host = doc.createElement("div");
  host.setAttribute(DATA_VE_RICH_TEXT_TOOLBAR_ATTR, "");
  host.setAttribute(DATA_VE_LAYER_ATTR, "toolbar");
  host.style.display = HIDDEN_DISPLAY;
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = TEMPLATE;
  doc.body.append(host);

  const allowedActions = allowedActionsOf(formats);
  for (const button of shadow.querySelectorAll("button")) {
    button.hidden = allowedActions[button.getAttribute(ACTION_ATTR) ?? ""] !== true;
  }
  const hasControls = Object.values(allowedActions).includes(true);
  const linkInput = shadow.querySelector("input");
  const linkProblem = shadow.querySelector<HTMLElement>(`#${LINK_PROBLEM_ID}`);
  let shownLink: string | null = null;
  let placedAt: DOMRect | null = null;

  const isEditingLink = () => linkInput !== null && !linkInput.hidden;

  const place = (selection: DOMRect) => {
    placedAt = selection;
    const win = doc.defaultView ?? window;
    host.style.visibility = isInView(selection, win) || isEditingLink() ? "" : OUT_OF_VIEW;
    const { left, top } = positionOf(host, selection, win);
    const zoom = zoomOf(host);
    host.style.transform = `translate(${left / zoom}px, ${top / zoom}px)`;
  };

  const placeAgain = () => {
    if (placedAt) place(placedAt);
  };

  const sayLinkProblem = (problem: string | null) => {
    if (linkInput && problem) linkInput.setAttribute(INVALID_ATTR, "true");
    else linkInput?.removeAttribute(INVALID_ATTR);
    if (linkProblem) {
      linkProblem.textContent = problem ?? "";
      linkProblem.hidden = problem === null;
    }
    placeAgain();
  };

  const press = (action: string, isPressed: boolean) => {
    shadow.querySelector(actionSelector(action))?.setAttribute(PRESSED_ATTR, String(isPressed));
  };

  const closeLink = () => {
    if (!linkInput || linkInput.hidden) return;
    linkInput.hidden = true;
    sayLinkProblem(null);
    events.onLinkClosed();
  };

  const editLink = () => {
    if (!linkInput || !formats.hasLinks) return;
    linkInput.hidden = false;
    linkInput.value = shownLink ?? "";
    placeAgain();
    linkInput.focus();
    linkInput.select();
  };

  const applyLink = () => {
    if (!linkInput) return;
    const url = linkUrlOf(linkInput.value);
    if (url !== "" && !isAllowedLinkUrl(url)) {
      sayLinkProblem(LINK_PROBLEM);
      return;
    }
    events.onLink(url === "" ? null : url);
    closeLink();
  };

  const runAction = (event: Event) => {
    const button = event.target instanceof Element ? event.target.closest("button") : null;
    const action = button?.getAttribute(ACTION_ATTR) ?? null;
    if (isToggle(action)) events.onToggle(action);
    else if (action === LINK_ACTION && isEditingLink()) closeLink();
    else if (action === LINK_ACTION) editLink();
  };

  const keepSelectionOfThePage = (event: Event) => {
    if (event.target !== linkInput) event.preventDefault();
  };

  const handleLinkKey = (event: KeyboardEvent) => {
    if (event.key !== APPLY_KEY && event.key !== CLOSE_KEY) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === APPLY_KEY) applyLink();
    else closeLink();
  };

  shadow.addEventListener("click", runAction);
  shadow.addEventListener("mousedown", keepSelectionOfThePage);
  linkInput?.addEventListener("keydown", handleLinkKey);
  linkInput?.addEventListener("input", () => sayLinkProblem(null));

  return {
    editLink,
    follow(selection) {
      if (host.style.display === SHOWN_DISPLAY) place(selection);
    },
    hasControls,
    hide() {
      if (linkInput) linkInput.hidden = true;
      if (linkProblem) linkProblem.hidden = true;
      host.style.display = HIDDEN_DISPLAY;
    },
    host,
    isEditingLink,
    remove() {
      host.remove();
    },
    show(shown, selection) {
      if (!hasControls) return;
      for (const action of TOGGLES) press(action, shown[action]);
      press(LINK_ACTION, shown.link !== null);
      shownLink = shown.link;
      host.style.display = SHOWN_DISPLAY;
      place(selection);
    },
  };
}

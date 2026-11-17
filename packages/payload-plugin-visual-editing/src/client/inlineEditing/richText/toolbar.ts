import type { ShownFormats, ToolbarAction } from "./pageEditor.js";

import { isAllowedLinkUrl, linkUrlOf } from "../../../shared/richText/linkUrls.js";

export type ToolbarEvents = {
  onToggle(action: ToolbarAction): void;
  onLink(url: string | null): void;
  onLinkClosed(): void;
};

export interface Toolbar {
  readonly host: HTMLElement;
  show(formats: ShownFormats, selection: DOMRect): void;
  follow(selection: DOMRect): void;
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
const HIDDEN_DISPLAY = "none";
const SHOWN_DISPLAY = "block";
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
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 4px;
    background: var(--ve-surface);
    border: 1px solid var(--ve-border);
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04), 0 8px 24px -6px rgba(0, 0, 0, 0.2);
    color: var(--ve-text);
    font: 500 13px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    white-space: nowrap;
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
    width: 220px;
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
  [hidden] {
    display: none;
  }
</style>
<div role="toolbar" aria-label="Text formatting">
  <button type="button" ${ACTION_ATTR}="bold" ${PRESSED_ATTR}="false" aria-label="Bold" title="Bold">B</button>
  <button type="button" ${ACTION_ATTR}="italic" ${PRESSED_ATTR}="false" aria-label="Italic" title="Italic">I</button>
  <button type="button" ${ACTION_ATTR}="underline" ${PRESSED_ATTR}="false" aria-label="Underline" title="Underline">U</button>
  <button type="button" ${ACTION_ATTR}="${LINK_ACTION}" ${PRESSED_ATTR}="false" aria-label="Link" title="Link">Link</button>
  <input type="text" inputmode="url" aria-label="Link address" placeholder="https://" hidden>
  <button type="button" ${ACTION_ATTR}="h2" ${PRESSED_ATTR}="false" aria-label="Heading 2" title="Heading 2">H2</button>
  <button type="button" ${ACTION_ATTR}="h3" ${PRESSED_ATTR}="false" aria-label="Heading 3" title="Heading 3">H3</button>
  <button type="button" ${ACTION_ATTR}="bullet" ${PRESSED_ATTR}="false" aria-label="Bullet list" title="Bullet list">&bull; List</button>
  <button type="button" ${ACTION_ATTR}="number" ${PRESSED_ATTR}="false" aria-label="Numbered list" title="Numbered list">1. List</button>
</div>
`;

const actionSelector = (action: string) => `[${ACTION_ATTR}="${action}"]`;

const isToggle = (action: string | null): action is ToolbarAction =>
  (TOGGLES as readonly string[]).includes(action ?? "");

const positionOf = (host: HTMLElement, selection: DOMRect, win: Window) => {
  const { height, width } = host.getBoundingClientRect();
  const above = selection.top - height - GAP_PX;
  const top = above >= 0 ? above : selection.bottom + GAP_PX;
  const centred = selection.left + selection.width / 2 - width / 2;
  const left = Math.max(GAP_PX, Math.min(centred, win.innerWidth - width - GAP_PX));
  return { left, top };
};

export function createToolbar(doc: Document, events: ToolbarEvents): Toolbar {
  const host = doc.createElement("div");
  host.setAttribute(DATA_VE_RICH_TEXT_TOOLBAR_ATTR, "");
  host.style.display = HIDDEN_DISPLAY;
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = TEMPLATE;
  doc.body.append(host);

  const linkInput = shadow.querySelector("input");
  let shownLink: string | null = null;

  const place = (selection: DOMRect) => {
    const { left, top } = positionOf(host, selection, doc.defaultView ?? window);
    host.style.transform = `translate(${left}px, ${top}px)`;
  };

  const press = (action: string, isPressed: boolean) => {
    shadow.querySelector(actionSelector(action))?.setAttribute(PRESSED_ATTR, String(isPressed));
  };

  const isEditingLink = () => linkInput !== null && !linkInput.hidden;

  const closeLink = () => {
    if (!linkInput || linkInput.hidden) return;
    linkInput.hidden = true;
    linkInput.removeAttribute(INVALID_ATTR);
    events.onLinkClosed();
  };

  const editLink = () => {
    if (!linkInput) return;
    linkInput.hidden = false;
    linkInput.value = shownLink ?? "";
    linkInput.focus();
    linkInput.select();
  };

  const applyLink = () => {
    if (!linkInput) return;
    const url = linkUrlOf(linkInput.value);
    if (url !== "" && !isAllowedLinkUrl(url)) {
      linkInput.setAttribute(INVALID_ATTR, "true");
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
  linkInput?.addEventListener("input", () => linkInput.removeAttribute(INVALID_ATTR));

  return {
    editLink,
    follow(selection) {
      if (host.style.display === SHOWN_DISPLAY) place(selection);
    },
    hide() {
      if (linkInput) linkInput.hidden = true;
      host.style.display = HIDDEN_DISPLAY;
    },
    host,
    isEditingLink,
    remove() {
      host.remove();
    },
    show(formats, selection) {
      for (const action of TOGGLES) press(action, formats[action]);
      press(LINK_ACTION, formats.link !== null);
      shownLink = formats.link;
      host.style.display = SHOWN_DISPLAY;
      place(selection);
    },
  };
}

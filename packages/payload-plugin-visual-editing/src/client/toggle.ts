import type { VisualEditingMode } from "./visualEditingMode.js";

import { zoomOf } from "./overlay/zoom.js";
import { VISUAL_EDITING_MODES } from "./visualEditingMode.js";

export interface Toggle {
  show(mode: VisualEditingMode): void;
  remove(): void;
}

export const DATA_VE_TOGGLE_ATTR = "data-ve-toggle";

const DRAGGING_ATTR = "data-dragging";
const ON_ATTR = "data-on";

const MODES: Record<VisualEditingMode, { label: string; description: string }> = {
  always: { description: "Outline all editable content", label: "Always" },
  hover: { description: "Outline editable content on hover", label: "Hover" },
  off: { description: "Hide edit outlines", label: "Off" },
};

const modeButton = (mode: VisualEditingMode) =>
  `<button type="button" role="radio" tabindex="-1" data-mode="${mode}" title="${MODES[mode].description}" aria-label="${MODES[mode].description}">${MODES[mode].label}</button>`;

/** Where the control was dropped, kept between page loads. */
export const TOGGLE_POSITION_STORAGE_KEY = "visual-editing-toggle-position";
const EDGE_GAP = 12;
const DRAG_THRESHOLD = 3;

/** Distance from the top and right edges of the viewport. */
type TogglePosition = { top: number; right: number };
const DEFAULT_POSITION: TogglePosition = { right: 16, top: 16 };

// Mirrors the Payload admin: a light elevated card, 8px radius, system font, sentence-case labels
// and a segmented control whose active option is a raised white thumb. It starts in the top right
// corner, where a page that scrolls inside Live Preview cannot push it out of view, and can be
// dragged by any part that is not a mode button. Custom properties pass into the shadow root, so
// `--ve-accent` from the page colours the "on" dot. Dark mode follows the operating system.
const TEMPLATE = `
<style>
  :host {
    all: initial;
    position: fixed;
    top: ${DEFAULT_POSITION.top}px;
    right: ${DEFAULT_POSITION.right}px;
    z-index: 2147483646;
    --ve-surface: #ffffff;
    --ve-border: rgba(0, 0, 0, 0.1);
    --ve-track: rgba(0, 0, 0, 0.05);
    --ve-text: #141414;
    --ve-muted: #6b6b6b;
    --ve-thumb: #ffffff;
    --ve-thumb-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.1);
    --ve-on: var(--ve-accent, #7c3aed);
    --ve-focus: #141414;
  }
  @media (prefers-color-scheme: dark) {
    :host {
      --ve-surface: #222222;
      --ve-border: rgba(255, 255, 255, 0.1);
      --ve-track: rgba(255, 255, 255, 0.06);
      --ve-text: #f5f5f5;
      --ve-muted: #a3a3a3;
      --ve-thumb: #3a3a3a;
      --ve-thumb-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06), 0 1px 2px rgba(0, 0, 0, 0.4);
      --ve-focus: #f5f5f5;
    }
  }
  .card {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 4px;
    background: var(--ve-surface);
    border: 1px solid var(--ve-border);
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04), 0 8px 24px -6px rgba(0, 0, 0, 0.14);
    color: var(--ve-text);
    font: 500 13px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
    transition: box-shadow 140ms ease;
  }
  :host([${DRAGGING_ATTR}]) .card {
    cursor: grabbing;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.06), 0 16px 32px -8px rgba(0, 0, 0, 0.22);
  }
  .grip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 24px;
    margin-right: -2px;
    color: var(--ve-muted);
    opacity: 0.6;
  }
  .card:hover .grip { opacity: 1; }
  .label {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    white-space: nowrap;
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--ve-muted);
    opacity: 0.45;
    transition: background-color 160ms ease, opacity 160ms ease, box-shadow 160ms ease;
  }
  :host([${ON_ATTR}]) .dot {
    background: var(--ve-on);
    opacity: 1;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ve-on) 22%, transparent);
  }
  [role="radiogroup"] {
    display: inline-flex;
    gap: 2px;
    padding: 2px;
    background: var(--ve-track);
    border-radius: 6px;
  }
  button {
    appearance: none;
    margin: 0;
    padding: 6px 10px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--ve-muted);
    font: inherit;
    line-height: 1;
    cursor: pointer;
    transition: background-color 160ms ease, color 160ms ease, box-shadow 160ms ease;
    -webkit-tap-highlight-color: transparent;
  }
  button:hover { color: var(--ve-text); }
  button[aria-checked="true"] {
    background: var(--ve-thumb);
    color: var(--ve-text);
    box-shadow: var(--ve-thumb-shadow);
  }
  button:focus-visible {
    outline: 2px solid var(--ve-focus);
    outline-offset: 1px;
  }
  @media (prefers-reduced-motion: reduce) {
    .card, button, .dot { transition: none; }
  }
</style>
<div class="card" title="Drag to move">
  <span class="grip" aria-hidden="true">
    <svg width="6" height="10" viewBox="0 0 6 10" fill="currentColor">
      <circle cx="1" cy="1" r="1" /><circle cx="5" cy="1" r="1" />
      <circle cx="1" cy="5" r="1" /><circle cx="5" cy="5" r="1" />
      <circle cx="1" cy="9" r="1" /><circle cx="5" cy="9" r="1" />
    </svg>
  </span>
  <span class="label" id="ve-toggle-label"><span class="dot" aria-hidden="true"></span>Visual editing</span>
  <div role="radiogroup" aria-labelledby="ve-toggle-label">
    ${VISUAL_EDITING_MODES.map(modeButton).join("")}
  </div>
</div>
`;

const readStoredPosition = (win: Window): TogglePosition | null => {
  try {
    const parsed: unknown = JSON.parse(
      win.localStorage.getItem(TOGGLE_POSITION_STORAGE_KEY) ?? "null"
    );
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as TogglePosition).top === "number" &&
      typeof (parsed as TogglePosition).right === "number"
    ) {
      return parsed as TogglePosition;
    }
  } catch {
    // Storage can be unavailable or hold something else; the default corner is used.
  }
  return null;
};

const storePosition = (win: Window, position: TogglePosition): void => {
  try {
    win.localStorage.setItem(TOGGLE_POSITION_STORAGE_KEY, JSON.stringify(position));
  } catch {
    // The position is a convenience; losing it is fine.
  }
};

/** Keeps the whole control inside the viewport. */
const clampPosition = (win: Window, position: TogglePosition, el: HTMLElement): TogglePosition => {
  const zoom = zoomOf(el);
  const maxRight = Math.max(EDGE_GAP, win.innerWidth - el.offsetWidth * zoom - EDGE_GAP);
  const maxTop = Math.max(EDGE_GAP, win.innerHeight - el.offsetHeight * zoom - EDGE_GAP);
  return {
    right: Math.min(maxRight, Math.max(EDGE_GAP, position.right)),
    top: Math.min(maxTop, Math.max(EDGE_GAP, position.top)),
  };
};

type Step = (index: number, count: number) => number;

const toNext: Step = (index, count) => (index + 1) % count;
const toPrevious: Step = (index, count) => (index - 1 + count) % count;

const STEP_OF_KEY: Readonly<Record<string, Step | undefined>> = {
  ArrowDown: toNext,
  ArrowLeft: toPrevious,
  ArrowRight: toNext,
  ArrowUp: toPrevious,
  End: (_index, count) => count - 1,
  Home: () => 0,
};

const isMode = (value: string | undefined): value is VisualEditingMode =>
  VISUAL_EDITING_MODES.some((mode) => mode === value);

export function createToggle(doc: Document, onSelect: (mode: VisualEditingMode) => void): Toggle {
  const host = doc.createElement("div");
  host.setAttribute(DATA_VE_TOGGLE_ATTR, "");
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = TEMPLATE;
  const buttons = [...shadow.querySelectorAll<HTMLButtonElement>("button")];

  shadow.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest("button") : null;
    const mode = button?.dataset.mode;
    if (isMode(mode)) onSelect(mode);
  });

  shadow.addEventListener("keydown", (event) => {
    const step = event instanceof KeyboardEvent ? STEP_OF_KEY[event.key] : undefined;
    const index = event.target instanceof HTMLButtonElement ? buttons.indexOf(event.target) : -1;
    if (!step || index === -1) return;
    const button = buttons[step(index, buttons.length)];
    const mode = button?.dataset.mode;
    if (!button || !isMode(mode)) return;
    event.preventDefault();
    button.focus();
    onSelect(mode);
  });

  const win = doc.defaultView ?? window;
  const place = (position: TogglePosition) => {
    const zoom = zoomOf(host);
    host.style.top = `${position.top / zoom}px`;
    host.style.right = `${position.right / zoom}px`;
  };

  const card = shadow.querySelector<HTMLElement>(".card");
  const startDrag = (event: PointerEvent) => {
    if (!card || event.button !== 0) return;
    if (event.composedPath().some((node) => node instanceof HTMLButtonElement)) return;
    const rect = host.getBoundingClientRect();
    const origin = { right: win.innerWidth - rect.right, top: rect.top };
    const start = { x: event.clientX, y: event.clientY };
    let latest: TogglePosition | null = null;
    card.setPointerCapture?.(event.pointerId);

    const move = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - start.x;
      const dy = moveEvent.clientY - start.y;
      if (!latest && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      host.toggleAttribute(DRAGGING_ATTR, true);
      latest = clampPosition(win, { right: origin.right - dx, top: origin.top + dy }, host);
      place(latest);
    };
    const end = () => {
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerup", end);
      card.removeEventListener("pointercancel", end);
      host.toggleAttribute(DRAGGING_ATTR, false);
      if (latest) storePosition(win, latest);
    };
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerup", end);
    card.addEventListener("pointercancel", end);
  };
  card?.addEventListener("pointerdown", startDrag);

  const keepInView = () => {
    const rect = host.getBoundingClientRect();
    place(clampPosition(win, { right: win.innerWidth - rect.right, top: rect.top }, host));
  };
  win.addEventListener("resize", keepInView);

  doc.body.append(host);
  const stored = readStoredPosition(win);
  if (stored) place(clampPosition(win, stored, host));

  return {
    remove() {
      win.removeEventListener("resize", keepInView);
      host.remove();
    },
    show(shownMode) {
      host.toggleAttribute(ON_ATTR, shownMode !== "off");
      for (const button of buttons) {
        const isShown = button.dataset.mode === shownMode;
        button.setAttribute("aria-checked", String(isShown));
        button.tabIndex = isShown ? 0 : -1;
      }
    },
  };
}

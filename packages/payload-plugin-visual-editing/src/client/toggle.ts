import type { VisualEditingMode } from "./visualEditingMode.js";

import { DATA_VE_HOVERING_ATTR } from "./overlay/constants.js";
import { VISUAL_EDITING_MODES } from "./visualEditingMode.js";

export interface Toggle {
  show(mode: VisualEditingMode): void;
  remove(): void;
}

export const DATA_VE_TOGGLE_ATTR = "data-ve-toggle";

const HIDDEN_ATTR = "data-hidden";

const MODES: Record<VisualEditingMode, { label: string; description: string }> = {
  always: { description: "Always show edit outlines", label: "Always" },
  hover: { description: "Show edit outline on hover only", label: "Hover" },
  off: { description: "Disable visual editing", label: "Off" },
};

const modeButton = (mode: VisualEditingMode) =>
  `<button type="button" role="radio" tabindex="-1" data-mode="${mode}" title="${MODES[mode].description}" aria-label="${MODES[mode].description}">${MODES[mode].label}</button>`;

const TEMPLATE = `
<style>
  :host {
    all: initial;
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 2147483646;
    transition: opacity 140ms ease, transform 140ms ease;
  }
  :host([${HIDDEN_ATTR}]) {
    opacity: 0;
    transform: translateY(8px);
    pointer-events: none;
  }
  [role="radiogroup"] {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 4px;
    background: rgba(18, 18, 18, 0.92);
    backdrop-filter: blur(12px) saturate(140%);
    -webkit-backdrop-filter: blur(12px) saturate(140%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.4), 0 4px 12px -2px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.05);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  [aria-hidden] {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    color: rgba(52, 211, 153, 0.85);
  }
  button {
    appearance: none;
    border: 0;
    margin: 0;
    padding: 6px 11px;
    font-family: inherit;
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    border-radius: 6px;
    cursor: pointer;
    background: transparent;
    color: rgba(255, 255, 255, 0.55);
    transition: background-color 160ms ease, color 160ms ease;
    -webkit-tap-highlight-color: transparent;
  }
  button[aria-checked="true"] {
    background: #34d399;
    color: #022c22;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.24);
  }
  button[aria-checked="false"]:hover {
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.92);
  }
  button:focus-visible {
    outline: 2px solid #34d399;
    outline-offset: 2px;
  }
</style>
<div role="radiogroup" aria-label="Visual editing mode">
  <span aria-hidden="true">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11.2 2.2l2.6 2.6-8.5 8.5L1.5 14l.7-3.8z" />
      <path d="M10 3.4l2.6 2.6" />
    </svg>
  </span>
  ${VISUAL_EDITING_MODES.map(modeButton).join("")}
</div>
`;

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

  const followHovering = () =>
    host.toggleAttribute(HIDDEN_ATTR, doc.body.hasAttribute(DATA_VE_HOVERING_ATTR));
  const hovering = new MutationObserver(followHovering);
  hovering.observe(doc.body, { attributeFilter: [DATA_VE_HOVERING_ATTR] });
  doc.body.append(host);

  return {
    remove() {
      hovering.disconnect();
      host.remove();
    },
    show(shownMode) {
      for (const button of buttons) {
        const isShown = button.dataset.mode === shownMode;
        button.setAttribute("aria-checked", String(isShown));
        button.tabIndex = isShown ? 0 : -1;
      }
    },
  };
}

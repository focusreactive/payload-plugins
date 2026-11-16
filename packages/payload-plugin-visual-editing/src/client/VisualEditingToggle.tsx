"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { VisualEditingMode } from "./visualEditingMode.js";

import { VISUAL_EDITING_MODES } from "./visualEditingMode.js";
import { useVisualEditing } from "./VisualEditingProvider.js";

const STYLE_ID = "ve-toggle-styles";

// Mirrors the Payload admin: neutral elevation surfaces, 4px radii, system font,
// sentence-case labels, and the admin's blue for the "on" indicator.
const SCOPED_STYLES = `
.ve-toggle {
  --ve-surface: #ffffff;
  --ve-border: rgba(0, 0, 0, 0.1);
  --ve-track: rgba(0, 0, 0, 0.05);
  --ve-text: #141414;
  --ve-muted: #6b6b6b;
  --ve-thumb: #ffffff;
  --ve-thumb-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.1);
  --ve-on: rgb(36, 164, 223);
  --ve-focus: #141414;
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2147483646;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 4px 4px 10px;
  background: var(--ve-surface);
  border: 1px solid var(--ve-border);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04), 0 8px 24px -6px rgba(0, 0, 0, 0.14);
  color: var(--ve-text);
  font: 500 13px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  transition: opacity 140ms ease, transform 140ms ease;
}
@media (prefers-color-scheme: dark) {
  .ve-toggle {
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
body[data-ve-hovering='true'] .ve-toggle {
  opacity: 0;
  transform: translateY(6px);
  pointer-events: none;
}
.ve-toggle__label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
}
.ve-toggle__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ve-muted);
  opacity: 0.45;
  transition: background-color 160ms ease, opacity 160ms ease, box-shadow 160ms ease;
}
.ve-toggle[data-ve-on='true'] .ve-toggle__dot {
  background: var(--ve-on);
  opacity: 1;
  box-shadow: 0 0 0 3px rgba(36, 164, 223, 0.18);
}
.ve-toggle__track {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  background: var(--ve-track);
  border-radius: 6px;
}
.ve-toggle__option {
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
.ve-toggle__option:hover {
  color: var(--ve-text);
}
.ve-toggle__option[aria-checked='true'] {
  background: var(--ve-thumb);
  color: var(--ve-text);
  box-shadow: var(--ve-thumb-shadow);
}
.ve-toggle__option:focus-visible {
  outline: 2px solid var(--ve-focus);
  outline-offset: 1px;
}
@media (prefers-reduced-motion: reduce) {
  .ve-toggle, .ve-toggle__option, .ve-toggle__dot { transition: none; }
}
`;

const MODE_LABELS: Record<VisualEditingMode, string> = {
  off: "Off",
  hover: "Hover",
  always: "Always",
};

const MODE_DESCRIPTIONS: Record<VisualEditingMode, string> = {
  off: "Hide edit outlines",
  hover: "Outline editable content on hover",
  always: "Outline all editable content",
};

function ensureStylesInjected(): void {
  // oxlint-disable-next-line unicorn/prefer-query-selector -- ids are not guaranteed to be valid CSS selectors
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = SCOPED_STYLES;
  document.head.append(style);
}

export function VisualEditingToggle(): React.ReactElement | null {
  const { available, mode, setMode } = useVisualEditing();
  const [mounted, setMounted] = useState(false);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    setMounted(true);
    ensureStylesInjected();
  }, []);

  if (!mounted || !available) return null;

  const select = (index: number) => {
    const count = VISUAL_EDITING_MODES.length;
    const next = VISUAL_EDITING_MODES[(index + count) % count];
    if (!next) return;
    setMode(next);
    optionRefs.current[(index + count) % count]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      select(index + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      select(index - 1);
    }
  };

  const control = (
    <div className="ve-toggle" data-ve-toggle-root="" data-ve-on={String(mode !== "off")}>
      <span className="ve-toggle__label" id="ve-toggle-label">
        <span className="ve-toggle__dot" aria-hidden="true" />
        Visual editing
      </span>
      <div className="ve-toggle__track" role="radiogroup" aria-labelledby="ve-toggle-label">
        {VISUAL_EDITING_MODES.map((m, index) => {
          const active = m === mode;
          return (
            <button
              key={m}
              ref={(node) => {
                optionRefs.current[index] = node;
              }}
              type="button"
              role="radio"
              className="ve-toggle__option"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              title={MODE_DESCRIPTIONS[m]}
              data-ve-toggle-btn=""
              data-ve-active={String(active)}
              onClick={() => setMode(m)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {MODE_LABELS[m]}
            </button>
          );
        })}
      </div>
    </div>
  );

  return createPortal(control, document.body);
}

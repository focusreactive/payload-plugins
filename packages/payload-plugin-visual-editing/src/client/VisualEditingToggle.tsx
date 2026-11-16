"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { VisualEditingMode } from "./visualEditingMode.js";

import { VISUAL_EDITING_MODES } from "./visualEditingMode.js";
import { useVisualEditing } from "./VisualEditingProvider.js";

const STYLE_ID = "ve-toggle-styles";
const POSITION_STORAGE_KEY = "visual-editing-toggle-position";
const EDGE_GAP = 12;
const DRAG_THRESHOLD = 3;

/** Distance from the top and right edges of the viewport. */
type TogglePosition = { top: number; right: number };
const DEFAULT_POSITION: TogglePosition = { top: 16, right: 16 };

// Mirrors the Payload admin: neutral elevation surfaces, 4px radii, system font,
// sentence-case labels, and the overlay's violet for the "on" indicator.
const SCOPED_STYLES = `
.ve-toggle {
  --ve-surface: #ffffff;
  --ve-border: rgba(0, 0, 0, 0.1);
  --ve-track: rgba(0, 0, 0, 0.05);
  --ve-text: #141414;
  --ve-muted: #6b6b6b;
  --ve-thumb: #ffffff;
  --ve-thumb-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.1);
  --ve-on: var(--ve-accent, #7c3aed);
  --ve-focus: #141414;
  position: fixed;
  z-index: 2147483646;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 4px 4px 4px;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  background: var(--ve-surface);
  border: 1px solid var(--ve-border);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04), 0 8px 24px -6px rgba(0, 0, 0, 0.14);
  color: var(--ve-text);
  font: 500 13px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  transition: opacity 140ms ease, transform 140ms ease, box-shadow 140ms ease;
}
.ve-toggle[data-ve-dragging='true'] {
  cursor: grabbing;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.06), 0 16px 32px -8px rgba(0, 0, 0, 0.22);
  transition: none;
}
.ve-toggle__grip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 24px;
  margin-right: -2px;
  color: var(--ve-muted);
  opacity: 0.6;
}
.ve-toggle:hover .ve-toggle__grip {
  opacity: 1;
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
body[data-ve-hovering='true'] .ve-toggle:not([data-ve-dragging='true']) {
  opacity: 0;
  transform: translateY(-6px);
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
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ve-on) 22%, transparent);
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

const GRIP_ICON = (
  <svg width="6" height="10" viewBox="0 0 6 10" fill="currentColor" aria-hidden="true">
    <circle cx="1" cy="1" r="1" />
    <circle cx="5" cy="1" r="1" />
    <circle cx="1" cy="5" r="1" />
    <circle cx="5" cy="5" r="1" />
    <circle cx="1" cy="9" r="1" />
    <circle cx="5" cy="9" r="1" />
  </svg>
);

const readStoredPosition = (): TogglePosition => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(POSITION_STORAGE_KEY) ?? "null");
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as TogglePosition).top === "number" &&
      typeof (parsed as TogglePosition).right === "number"
    ) {
      return parsed as TogglePosition;
    }
  } catch {
    // Storage can be unavailable or hold something else; fall back to the default corner.
  }
  return DEFAULT_POSITION;
};

const storePosition = (position: TogglePosition): void => {
  try {
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position));
  } catch {
    // The position is a convenience; losing it is fine.
  }
};

/** Keeps the whole control inside the viewport. */
const clampPosition = (position: TogglePosition, el: HTMLElement | null): TogglePosition => {
  const width = el?.offsetWidth ?? 0;
  const height = el?.offsetHeight ?? 0;
  const maxRight = Math.max(EDGE_GAP, window.innerWidth - width - EDGE_GAP);
  const maxTop = Math.max(EDGE_GAP, window.innerHeight - height - EDGE_GAP);
  return {
    top: Math.min(maxTop, Math.max(EDGE_GAP, position.top)),
    right: Math.min(maxRight, Math.max(EDGE_GAP, position.right)),
  };
};

/**
 * Lets the control be dragged anywhere in the viewport by any part that is not a mode button.
 * It starts in the top right corner, above the fold of a page that scrolls inside Live Preview,
 * and the place it is dropped is remembered.
 */
function useDraggablePosition(rootRef: React.RefObject<HTMLDivElement | null>, rendered: boolean) {
  const [position, setPosition] = useState<TogglePosition>(DEFAULT_POSITION);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!rendered) return;
    setPosition(clampPosition(readStoredPosition(), rootRef.current));
    const onResize = () => setPosition((current) => clampPosition(current, rootRef.current));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [rootRef, rendered]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      if ((event.target as Element).closest("button")) return;
      const root = rootRef.current;
      if (!root) return;
      const start = { x: event.clientX, y: event.clientY };
      const origin = clampPosition(
        {
          top: root.getBoundingClientRect().top,
          right: window.innerWidth - root.getBoundingClientRect().right,
        },
        root
      );
      let moved = false;
      let latest = origin;
      root.setPointerCapture(event.pointerId);

      const onMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - start.x;
        const dy = moveEvent.clientY - start.y;
        if (!moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        if (!moved) {
          moved = true;
          setDragging(true);
        }
        latest = clampPosition({ top: origin.top + dy, right: origin.right - dx }, root);
        setPosition(latest);
      };
      const onUp = () => {
        root.removeEventListener("pointermove", onMove);
        root.removeEventListener("pointerup", onUp);
        root.removeEventListener("pointercancel", onUp);
        if (root.hasPointerCapture(event.pointerId)) root.releasePointerCapture(event.pointerId);
        if (!moved) return;
        setDragging(false);
        storePosition(latest);
      };
      root.addEventListener("pointermove", onMove);
      root.addEventListener("pointerup", onUp);
      root.addEventListener("pointercancel", onUp);
    },
    [rootRef]
  );

  return { position, dragging, onPointerDown };
}

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
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { position, dragging, onPointerDown } = useDraggablePosition(rootRef, mounted && available);

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
    <div
      ref={rootRef}
      className="ve-toggle"
      data-ve-toggle-root=""
      data-ve-on={String(mode !== "off")}
      data-ve-dragging={String(dragging)}
      style={{ top: position.top, right: position.right }}
      title="Drag to move"
      onPointerDown={onPointerDown}
    >
      <span className="ve-toggle__grip" aria-hidden="true">
        {GRIP_ICON}
      </span>
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

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { VisualEditingMode } from "../constants.js";

import { VISUAL_EDITING_MODES } from "../constants.js";
import { useVisualEditing } from "./VisualEditingProvider.js";

// Pseudo-classes (:hover, :focus-visible) can't live on React style objects,
// so the rules are injected once into <head> under a dedicated id. The
// component reuses its own marker attribute to scope them without polluting
// global selectors.
const STYLE_ID = "ve-toggle-styles";

// `body[data-ve-hovering='true']` is set by the overlay's hoverController
// whenever an Edit badge is painted on a target. The badge sits at the target's
// top-right (see `editBadge.ts` LABEL_STYLES), so for targets near the page
// bottom it overlaps this toggle. Fading the toggle out during hover + a short
// grace period on clearing activeTarget (CLEAR_GRACE_MS in hoverController)
// keeps the toggle out of the way while the user navigates target → label.
const SCOPED_STYLES = `
[data-ve-toggle-root] {
	transition: opacity 140ms ease, transform 140ms ease;
}
body[data-ve-hovering='true'] [data-ve-toggle-root] {
	opacity: 0;
	transform: translateY(8px);
	pointer-events: none;
}
[data-ve-toggle-btn][data-ve-active="false"]:hover {
	background: rgba(255, 255, 255, 0.06);
	color: rgba(255, 255, 255, 0.92);
}
[data-ve-toggle-btn]:focus-visible {
	outline: 2px solid #34d399;
	outline-offset: 2px;
}
`;

const MODE_LABELS: Record<VisualEditingMode, string> = {
  off: "Off",
  always: "Always",
  hover: "Hover",
};

const MODE_DESCRIPTIONS: Record<VisualEditingMode, string> = {
  off: "Disable visual editing",
  always: "Always show edit outlines",
  hover: "Show edit outline on hover only",
};

const CONTAINER_STYLE: React.CSSProperties = {
  position: "fixed",
  right: "20px",
  bottom: "20px",
  zIndex: 2147483646,
  display: "inline-flex",
  alignItems: "center",
  gap: "2px",
  padding: "4px",
  background: "rgba(18, 18, 18, 0.92)",
  backdropFilter: "blur(12px) saturate(140%)",
  WebkitBackdropFilter: "blur(12px) saturate(140%)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "10px",
  boxShadow:
    "0 12px 32px -8px rgba(0, 0, 0, 0.4), 0 4px 12px -2px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  pointerEvents: "auto",
};

const BRAND_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "26px",
  height: "26px",
  color: "rgba(52, 211, 153, 0.85)",
  pointerEvents: "none",
};

const BUTTON_BASE: React.CSSProperties = {
  appearance: "none",
  border: 0,
  margin: 0,
  padding: "6px 11px",
  fontSize: "11px",
  fontFamily: "inherit",
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  borderRadius: "6px",
  cursor: "pointer",
  background: "transparent",
  color: "rgba(255, 255, 255, 0.55)",
  transition: "background-color 160ms ease, color 160ms ease",
  lineHeight: 1,
  WebkitTapHighlightColor: "transparent",
};

const ACTIVE_BUTTON: React.CSSProperties = {
  background: "#34d399",
  color: "#022c22",
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.24)",
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

  useEffect(() => {
    setMounted(true);
    ensureStylesInjected();
  }, []);

  if (!mounted || !available) return null;

  const control = (
    <div
      role="radiogroup"
      aria-label="Visual editing mode"
      data-ve-toggle-root=""
      style={CONTAINER_STYLE}
    >
      <span aria-hidden="true" style={BRAND_STYLE}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11.2 2.2l2.6 2.6-8.5 8.5L1.5 14l.7-3.8z" />
          <path d="M10 3.4l2.6 2.6" />
        </svg>
      </span>
      {VISUAL_EDITING_MODES.map((m) => {
        const active = m === mode;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={MODE_DESCRIPTIONS[m]}
            title={MODE_DESCRIPTIONS[m]}
            data-ve-toggle-btn=""
            data-ve-active={String(active)}
            onClick={() => setMode(m)}
            style={active ? { ...BUTTON_BASE, ...ACTIVE_BUTTON } : BUTTON_BASE}
          >
            {MODE_LABELS[m]}
          </button>
        );
      })}
    </div>
  );

  return createPortal(control, document.body);
}

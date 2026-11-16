export const STEGA_PREFILTER = /[\u200B-\u202F\uFEFF]/;

export const DATA_VE_TARGET_ATTR = "data-ve-target";
export const DATA_VE_FOR_ATTR = "data-ve-for";
export const LABEL_CLASS = "ve-edit-label";

export const isOverlayLabel = (node: Node): boolean =>
  node instanceof Element && node.classList.contains(LABEL_CLASS);

// Payload admin palette: blue-550 for the active outline and badge (white text keeps AA
// contrast), a translucent blue-400 for the quiet resting outline in "always" mode.
const ACCENT_STRONG = "rgb(12, 121, 168)";
const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** Outline painted on the element under the pointer. */
export const OUTLINE_STYLE = `1.5px solid ${ACCENT_STRONG}`;
/** Resting outline in "always" mode: present but quiet, so the page stays readable. */
export const OUTLINE_IDLE_STYLE = "1px dashed rgba(36, 164, 223, 0.55)";

export const STEGA_ATTRS = new Set(["alt", "title", "aria-label", "placeholder"]);

export const LABEL_ICON_SVG =
  '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:block;flex:none"><path d="M11.2 2.2l2.6 2.6-8.5 8.5L1.5 14l.7-3.8z"/><path d="M10 3.4l2.6 2.6"/></svg>';

export const LABEL_STYLES: Partial<CSSStyleDeclaration> = {
  position: "absolute",
  top: "0",
  right: "0",
  transform: "translateY(-100%)",
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  background: ACCENT_STRONG,
  color: "#fff",
  padding: "4px 8px 4px 7px",
  fontSize: "12px",
  fontFamily: FONT_STACK,
  fontWeight: "500",
  lineHeight: "16px",
  letterSpacing: "0",
  textTransform: "none",
  textDecoration: "none",
  border: "0",
  borderRadius: "4px 4px 0 0",
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.12)",
  cursor: "pointer",
  pointerEvents: "auto",
  zIndex: "9999",
  whiteSpace: "nowrap",
  fontStyle: "normal",
  fontVariant: "normal",
};

export const PAGE_SHOWN_EVENT = "pageshow";

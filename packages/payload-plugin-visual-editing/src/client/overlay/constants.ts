export const STEGA_PREFILTER = /[\u200B-\u202F\uFEFF]/;

export const DATA_VE_TARGET_ATTR = "data-ve-target";
export const DATA_VE_FOR_ATTR = "data-ve-for";
export const LABEL_CLASS = "ve-edit-label";

export const isOverlayLabel = (node: Node): boolean =>
  node instanceof Element && node.classList.contains(LABEL_CLASS);

// Payload admin palette: blue-550 for the active frame and badge (white text keeps AA
// contrast), a translucent blue-400 for the quiet resting frame in "always" mode.
const ACCENT_STRONG = "rgb(12, 121, 168)";
const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/**
 * Frames are drawn in a layer above the page as one rectangle around the element's box, so text
 * that wraps gets a single frame instead of one outline per line, and the page's own styles are
 * never touched. The border lies just outside the box, so the frame is exactly the area a click
 * opens.
 */
export const FRAME_RADIUS = "4px";
/** Frame of the element under the pointer. */
export const FRAME_ACTIVE_WIDTH = 2;
export const FRAME_ACTIVE_BORDER = `${FRAME_ACTIVE_WIDTH}px solid ${ACCENT_STRONG}`;
/** Resting frame in "always" mode: present but quiet, so the page stays readable. */
export const FRAME_IDLE_WIDTH = 1.5;
export const FRAME_IDLE_BORDER = `${FRAME_IDLE_WIDTH}px dashed rgba(36, 164, 223, 0.75)`;
export const DATA_VE_FRAME_ATTR = "data-ve-frame";

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

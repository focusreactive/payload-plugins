export const STEGA_PREFILTER = /[\u200B-\u202F\uFEFF]/;

export const DATA_VE_TARGET_ATTR = "data-ve-target";
export const DATA_VE_FOR_ATTR = "data-ve-for";
export const LABEL_CLASS = "ve-edit-label";

export const isOverlayLabel = (node: Node): boolean =>
  node instanceof Element && node.classList.contains(LABEL_CLASS);

const OUTLINE_COLOR = "#34d399";
const LABEL_TEXT_COLOR = "#022c22";
export const OUTLINE_STYLE = `1px solid ${OUTLINE_COLOR}`;

export const STEGA_ATTRS = new Set(["alt", "title", "aria-label", "placeholder"]);

export const LABEL_STYLES: Partial<CSSStyleDeclaration> = {
  position: "absolute",
  top: "0",
  right: "0",
  transform: "translateY(-100%)",
  background: OUTLINE_COLOR,
  color: LABEL_TEXT_COLOR,
  padding: "5px 11px",
  fontSize: "13px",
  fontFamily: "system-ui, -apple-system, sans-serif",
  fontWeight: "600",
  lineHeight: "1",
  letterSpacing: "0.025em",
  textTransform: "uppercase",
  textDecoration: "none",
  border: "0",
  borderRadius: "0",
  cursor: "pointer",
  pointerEvents: "auto",
  zIndex: "9999",
  whiteSpace: "nowrap",
  fontStyle: "normal",
  fontVariant: "normal",
};

export const PAGE_SHOWN_EVENT = "pageshow";

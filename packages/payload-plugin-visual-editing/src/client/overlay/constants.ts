// Skip decoding text nodes that can't possibly carry stega's zero-width chars.
export const STEGA_PREFILTER = /[\u200B-\u202F\uFEFF]/;

export const DATA_VE_TARGET_ATTR = "data-ve-target";
export const DATA_VE_FOR_ATTR = "data-ve-for";
export const LABEL_CLASS = "ve-edit-label";

// Match the visual-editing-mvp reference: a single flat emerald treatment,
// revealed only on hover. Outline hugs the content (no offset), 1px solid,
// same tailwind emerald-400 / emerald-950 palette used by SectionContainer
// and EditableField in the MVP.
export const OUTLINE_COLOR = "#34d399"; // tailwind emerald-400
export const LABEL_TEXT_COLOR = "#022c22"; // tailwind emerald-950
export const OUTLINE_STYLE = `1px solid ${OUTLINE_COLOR}`;

// Attribute names that legitimately carry stega (localized props forwarded to
// inputs, images, etc.). Narrowing the walk from "every attribute" to this
// allowlist cuts the element pass dramatically.
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
  // Neutralize typography inherited from the target so the label looks the
  // same over every field (headings, buttons, rich text, etc.).
  fontStyle: "normal",
  fontVariant: "normal",
};

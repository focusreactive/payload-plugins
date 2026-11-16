/** Set on the document form and on every panel body, holding the id of the instance that owns it. */
export const OWNER_ATTRIBUTE = "data-stacked-editing-owner";

/** Set next to OWNER_ATTRIBUTE: the `defaultMode` the rows in that scope follow. */
export const MODE_ATTRIBUTE = "data-stacked-editing-mode";

/** Briefly set on a field opened from the preview (Live Preview click). */
export const FLASH_CLASS = "stacked-editing__flash";

/** Set on <html> while panels are confined to the editor column (Live Preview open). */
export const CONFINED_ATTRIBUTE = "data-stacked-editing-confined";

const BASE = "stacked-editing";

// Arrow into a side panel (16×16, stroked), used as a CSS mask so it takes the theme colour.
const OPEN_ICON = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1.75" y="2.25" width="12.5" height="11.5" rx="1.5"/><path d="M9.75 2.25v11.5"/><path d="M4 8h3.5M5.75 6.25 7.5 8l-1.75 1.75"/></svg>'
)}")`;

/**
 * Only Payload's theme variables, so light and dark admin themes both work. Shipped as a string
 * rendered in a hoisted <style> (React 19 dedupes it by `href`) — no stylesheet import for the
 * host app's bundler to deal with.
 */
export const STACKED_EDITING_CSS = `
.${BASE}__header {
  display: flex;
  flex-direction: column;
  gap: calc(var(--base) * 0.4);
  margin-top: calc(var(--base) * 2);
  margin-bottom: calc(var(--base) * 1);
  padding-bottom: calc(var(--base) * 0.8);
  border-bottom: 1px solid var(--theme-elevation-100);
}
.${BASE}__crumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
  line-height: 20px;
  color: var(--theme-elevation-500);
}
.${BASE}__crumb {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
}
.${BASE}__crumb + .${BASE}__crumb::before {
  content: "/";
  padding: 0 4px;
  color: var(--theme-elevation-250);
}
.${BASE}__crumb-button {
  max-width: 24ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 0;
  border-radius: var(--style-radius-s, 3px);
  background: none;
  padding: 0 4px;
  margin: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
}
.${BASE}__crumb-button:hover,
.${BASE}__crumb-button:focus-visible {
  color: var(--theme-text);
  background: var(--theme-elevation-100);
  outline: none;
}
.${BASE}__crumb--field .${BASE}__crumb-button {
  color: var(--theme-elevation-400);
}
.${BASE}__crumb--current {
  padding: 0 4px;
  color: var(--theme-text);
  font-weight: 600;
}
.${BASE}__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--base);
}
.${BASE}__title {
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.${BASE}__kind {
  display: inline-block;
  margin-inline-end: calc(var(--base) * 0.5);
  padding: 0 calc(var(--base) * 0.4);
  border-radius: var(--style-radius-s, 3px);
  background: var(--theme-elevation-100);
  color: var(--theme-elevation-800);
  font-size: 13px;
  line-height: 22px;
  font-weight: 500;
  vertical-align: middle;
}
.${BASE}__close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--base) * 1.6);
  height: calc(var(--base) * 1.6);
  border: 0;
  border-radius: var(--style-radius-s, 3px);
  background: none;
  color: var(--theme-text);
  cursor: pointer;
  padding: 0;
}
.${BASE}__close:hover {
  background: var(--theme-elevation-100);
}
.${BASE}__close svg {
  width: calc(var(--base) * 2);
  height: calc(var(--base) * 2);
}
.${BASE}__body {
  padding-bottom: calc(var(--base) * 4);
}
.${BASE}__hint {
  margin: 0;
  font-size: 12px;
  color: var(--theme-elevation-400);
}
/*
 * "Open in panel" icon: the first item of the row header's actions, left of the "…" menu. It is
 * paint only (the actions wrap ignores pointer events); clicks land on Payload's toggle button and
 * are classified by position (see classifyHeaderClick). Panel mode shows it on hover, inline mode
 * always (faintly), since there it is the only way into a panel.
 */
[${OWNER_ATTRIBUTE}] :is(.blocks-field__row, .array-field__row)
  > .collapsible__toggle-wrap > .collapsible__actions-wrap::before {
  content: "";
  flex-shrink: 0;
  align-self: center;
  width: 24px;
  height: 24px;
  border-radius: var(--style-radius-s, 3px);
  background-color: var(--theme-elevation-800);
  -webkit-mask: ${OPEN_ICON} center / 16px 16px no-repeat;
  mask: ${OPEN_ICON} center / 16px 16px no-repeat;
  opacity: 0;
  transition: opacity 120ms linear;
}
[${MODE_ATTRIBUTE}="inline"] :is(.blocks-field__row, .array-field__row)
  > .collapsible__toggle-wrap > .collapsible__actions-wrap::before {
  opacity: 0.35;
}
[${OWNER_ATTRIBUTE}] :is(.blocks-field__row, .array-field__row)
  > .collapsible__toggle-wrap:hover > .collapsible__actions-wrap::before {
  opacity: 0.85;
}
/*
 * Live Preview open: the drawers sit over the editor column only. Payload's drawer derives both
 * its padding and its per-level offset from --gutter-h, so a smaller one keeps deep stacks usable
 * in a narrow column. The modal container stops swallowing clicks so the preview stays usable.
 */
.${BASE}__drawer--confined {
  --gutter-h: calc(var(--base) * 1.2);
  left: var(--stacked-editing-left, 0) !important;
  right: auto !important;
  width: var(--stacked-editing-width, 100vw) !important;
  top: var(--stacked-editing-top, 0) !important;
  height: calc(100vh - var(--stacked-editing-top, 0px)) !important;
}
.${BASE}__drawer--confined .${BASE}__header {
  margin-top: calc(var(--base) * 1.2);
}
html[${CONFINED_ATTRIBUTE}] .payload__modal-container {
  pointer-events: none !important;
}
html[${CONFINED_ATTRIBUTE}] .payload__modal-container > * {
  pointer-events: auto;
}
/* A field opened from a click in the preview: a pulsing ring, as the visual-editing bridge does. */
@keyframes stacked-editing-flash {
  0% { box-shadow: 0 0 0 0 hsla(189, 85%, 53%, 0.55), 0 0 0 0 hsla(189, 85%, 53%, 0.22); }
  50% { box-shadow: 0 0 0 4px hsla(189, 85%, 53%, 0.3), 0 0 0 14px hsla(189, 85%, 53%, 0.06); }
  100% { box-shadow: 0 0 0 0 hsla(189, 85%, 53%, 0), 0 0 0 0 hsla(189, 85%, 53%, 0); }
}
.${FLASH_CLASS} {
  border-radius: var(--style-radius-m, 4px);
  animation: stacked-editing-flash 0.7s cubic-bezier(0.4, 0, 0.2, 1) 120ms 2;
}
@media (prefers-reduced-motion: reduce) {
  .${FLASH_CLASS} {
    animation: none;
    box-shadow: 0 0 0 2px hsla(189, 85%, 53%, 0.6);
  }
}
`;

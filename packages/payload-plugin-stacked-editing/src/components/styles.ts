/** Set on the document form and on every panel body, holding the id of the instance that owns it. */
export const OWNER_ATTRIBUTE = "data-stacked-editing-owner";

/** Set on <html> while panels are confined to the editor column (Live Preview open). */
export const CONFINED_ATTRIBUTE = "data-stacked-editing-confined";

const BASE = "stacked-editing";

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
/* Rows open a panel: point the chevron of collapsed rows to the side, like a link. */
[${OWNER_ATTRIBUTE}] :is(.blocks-field__row, .array-field__row).collapsible--collapsed
  > .collapsible__toggle-wrap .collapsible__indicator {
  transform: rotate(-90deg);
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
`;

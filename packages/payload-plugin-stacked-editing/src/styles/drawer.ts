import { CONFINED_ATTRIBUTE } from "../lib/constants.js";
import { BASE } from "./base.js";

export const DRAWER_CSS = `
/* faceless-ui's modal container can stay offset after another modal closes. */
.${BASE}__drawer {
  position: fixed !important;
  top: 0;
  left: 0;
  right: 0;
}
.${BASE}__drawer--confined {
  /* Payload derives both the drawer padding and the per-level offset from --gutter-h. */
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
/* The open modal container would otherwise swallow clicks meant for the preview. */
html[${CONFINED_ATTRIBUTE}] .payload__modal-container {
  pointer-events: none !important;
}
html[${CONFINED_ATTRIBUTE}] .payload__modal-container > * {
  pointer-events: auto;
}
`;

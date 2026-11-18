import { MODE_ATTRIBUTE, OWNER_ATTRIBUTE } from "../lib/constants.js";

const OPEN_PANEL_ICON_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1.75" y="2.25" width="12.5" height="11.5" rx="1.5"/><path d="M9.75 2.25v11.5"/><path d="M4 8h3.5M5.75 6.25 7.5 8l-1.75 1.75"/></svg>'
)}")`;

export const ROW_HEADER_CSS = `
/* Paint only: clicks land on Payload's toggle button and are classified by position. */
[${OWNER_ATTRIBUTE}] :is(.blocks-field__row, .array-field__row)
  > .collapsible__toggle-wrap > .collapsible__actions-wrap::before {
  content: "";
  flex-shrink: 0;
  align-self: center;
  width: 24px;
  height: 24px;
  border-radius: var(--style-radius-s, 3px);
  background-color: var(--theme-elevation-800);
  -webkit-mask: ${OPEN_PANEL_ICON_MASK} center / 16px 16px no-repeat;
  mask: ${OPEN_PANEL_ICON_MASK} center / 16px 16px no-repeat;
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
`;

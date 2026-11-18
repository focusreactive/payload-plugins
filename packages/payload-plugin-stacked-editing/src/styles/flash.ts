import { FLASH_CLASS } from "../lib/constants.js";

export const FLASH_CSS = `
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

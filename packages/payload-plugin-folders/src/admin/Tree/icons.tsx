/** A house: the root page of a folder. Payload's icon set has none. */
export const HouseIcon = () => (
  <svg
    aria-hidden="true"
    className="fr-folders-icon"
    fill="none"
    height="16"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.5"
    viewBox="0 0 16 16"
    width="16"
  >
    <path d="M2 7.25 8 2l6 5.25" />
    <path d="M3.5 6.5V13.25h3V9.5h3v3.75h3V6.5" />
  </svg>
);

/** Three dots in a row: the button that opens a row's context menu. */
export const MoreIcon = () => (
  <svg
    aria-hidden="true"
    className="fr-folders-icon"
    fill="currentColor"
    height="16"
    viewBox="0 0 16 16"
    width="16"
  >
    <circle cx="3.5" cy="8" r="1.25" />
    <circle cx="8" cy="8" r="1.25" />
    <circle cx="12.5" cy="8" r="1.25" />
  </svg>
);

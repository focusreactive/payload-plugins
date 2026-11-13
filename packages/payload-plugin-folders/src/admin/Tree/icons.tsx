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

/** Two chain links, whole when the field follows its source and apart when it does not. */
export const LinkIcon = ({ isLinked }: { isLinked: boolean }) => (
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
    {isLinked ? (
      <>
        <path d="M6.75 9.25a2.5 2.5 0 0 0 3.5 0l2.25-2.25a2.5 2.5 0 0 0-3.5-3.5l-.75.75" />
        <path d="M9.25 6.75a2.5 2.5 0 0 0-3.5 0L3.5 9a2.5 2.5 0 0 0 3.5 3.5l.75-.75" />
      </>
    ) : (
      <>
        <path d="M7.5 4.25 8 3.75a2.5 2.5 0 0 1 3.5 3.5L10.5 8.25" />
        <path d="M8.5 11.75 8 12.25a2.5 2.5 0 0 1-3.5-3.5l1-1" />
        <path d="M2.5 2.5l11 11" />
      </>
    )}
  </svg>
);

/** A padlock: a page type a folder above has locked. */
export const LockIcon = () => (
  <svg
    aria-hidden="true"
    className="fr-folders-icon"
    fill="none"
    height="12"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.5"
    viewBox="0 0 16 16"
    width="12"
  >
    <rect height="6.5" rx="1.25" width="9.5" x="3.25" y="7.25" />
    <path d="M5.25 7.25V5.25a2.75 2.75 0 0 1 5.5 0v2" />
  </svg>
);

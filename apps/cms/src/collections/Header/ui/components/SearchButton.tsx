import { IconButton } from "./IconButton";

/**
 * Drawn in the design but with nowhere to point: the header content has no field for a search
 * destination, so this carries its label and no behaviour until one exists.
 */
export function SearchButton() {
  return (
    <IconButton aria-label="Search">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="5.6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12.4 12.4L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </IconButton>
  );
}

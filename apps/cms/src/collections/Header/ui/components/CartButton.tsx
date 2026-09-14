import { IconButton } from "./IconButton";

/**
 * Drawn in the design but with nowhere to point: the header content has no field for a cart
 * destination, so this carries its label and no behaviour until one exists.
 */
export function CartButton() {
  return (
    <IconButton aria-label="Cart" bordered>
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path
          d="M2 2h1.8l2 9.2h8.4l1.8-6.6H5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="7" cy="15" r="1.3" fill="currentColor" />
        <circle cx="13.4" cy="15" r="1.3" fill="currentColor" />
      </svg>
    </IconButton>
  );
}

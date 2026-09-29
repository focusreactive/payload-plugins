import { Link } from "@/lib/i18n/navigation";
import { SEARCH_CONFIG } from "@/lib/config/talks";

import { iconButtonClassName } from "./IconButton";

/**
 * Renders as a link rather than a button because it navigates. The destination is hardcoded for the
 * same reason the talks and topics base paths are: /search is a coded route, not a Page document,
 * so there is nothing for an editor to point a header field at.
 */
export function SearchButton() {
  return (
    <Link aria-label="Search" className={iconButtonClassName} href={SEARCH_CONFIG.basePath}>
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="5.6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12.4 12.4L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </Link>
  );
}

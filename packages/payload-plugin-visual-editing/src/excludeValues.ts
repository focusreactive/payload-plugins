export type ValueExcludePredicate = (value: string) => boolean;

/** Absolute (`https:`, `mailto:`, `data:`), protocol-relative (`//cdn`) or root-relative (`/path`) URLs: a marker in an `href` breaks the link. */
export const isUrl: ValueExcludePredicate = (value) =>
  /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(value);

/** Lowercase words joined by hyphens (`hello-world`). A single word (`hello`) stays editable. */
export const isSlug: ValueExcludePredicate = (value) => /^[a-z0-9]+(-[a-z0-9]+)+$/.test(value);

/** Fragment URLs (`#`, `#demo`). A hash followed by digits only (`#1`) is ranking text and stays editable. */
export const isHash: ValueExcludePredicate = (value) => /^#(?!\d+$)/.test(value);

/** ISO 8601 dates and timestamps (`2024-01-31`, `2024-01-31T10:00:00Z`), not `YYYY` or `YYYY-MM`. */
export const isIsoDate: ValueExcludePredicate = (value) =>
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(value);

export const defaultExcludeValues: readonly ValueExcludePredicate[] = [
  isUrl,
  isSlug,
  isHash,
  isIsoDate,
];

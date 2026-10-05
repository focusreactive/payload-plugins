export type ValueExcludePredicate = (value: string) => boolean;

// URL-like: absolute URLs with any scheme (`https://`, `mailto:`, `tel:`, `data:`, `file://`),
// protocol-relative (`//cdn`), or root-relative (`/path`). Encoding stega into URLs corrupts
// them when the string lands in an `href` — the zero-width chars percent-encode into garbage.
export const isUrl: ValueExcludePredicate = (value) =>
  /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(value);

// Multi-word hyphen-joined lowercase identifiers (`hello-world`, `e-commerce`). Requires at
// least one hyphen so plain single words (`hello`, `world`) still get stega. Intentionally broad
// — matches `state-of-the-art` too; users who want those editable can override via the
// excludeValues config.
export const isSlug: ValueExcludePredicate = (value) => /^[a-z0-9]+(-[a-z0-9]+)+$/.test(value);

// Hash-prefixed fragment URLs (`#`, `#demo`, `#section-1`). The `(?!\d+$)` carves out
// `#<number>` ranking text (`#1`, `#42`) so it stays editable. `#1a` or `#1 seed` still
// match — the rule is "hash followed by a purely numeric tail is NOT a fragment."
export const isHash: ValueExcludePredicate = (value) => /^#(?!\d+$)/.test(value);

// Strict ISO 8601 timestamps. Matches `YYYY-MM-DD` and the full `YYYY-MM-DDThh:mm:ss(.fff)?(Z|+hh:mm)?`
// shape. Does not match `YYYY` or `YYYY-MM` — those are too easily confused with regular content.
export const isIsoDate: ValueExcludePredicate = (value) =>
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(value);

export const defaultExcludeValues: readonly ValueExcludePredicate[] = [
  isUrl,
  isSlug,
  isHash,
  isIsoDate,
];

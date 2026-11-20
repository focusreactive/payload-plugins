export type ValueExcludePredicate = (value: string) => boolean;

// A URL has no whitespace: "New: Insights 2.0" or "Note: free trial" starts like a scheme but is text.
export const isUrl: ValueExcludePredicate = (value) =>
  /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)\S*$/iu.test(value);

export const isSlug: ValueExcludePredicate = (value) =>
  /^(?=.*[a-z])[a-z0-9]+(-[a-z0-9]+)+$/.test(value);

export const isHash: ValueExcludePredicate = (value) => /^#(?!\d+$)\S*$/.test(value);

export const isIsoDate: ValueExcludePredicate = (value) =>
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(value);

export const defaultExcludeValues: readonly ValueExcludePredicate[] = [
  isUrl,
  isSlug,
  isHash,
  isIsoDate,
];

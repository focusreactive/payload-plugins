export const PAGE_PARAM_KEYS = {
  pageRef: "fr_page_ref",
  contentLocale: "fr_content_locale",
} as const;

export const SYNTHETIC_REF_PREFIX = "__" as const;

export const DEFAULT_PAGE_DIMENSIONS = {
  pageRef: `customEvent:${PAGE_PARAM_KEYS.pageRef}`,
  contentLocale: `customEvent:${PAGE_PARAM_KEYS.contentLocale}`,
} as const;

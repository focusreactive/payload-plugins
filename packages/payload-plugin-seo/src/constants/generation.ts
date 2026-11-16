import { DEFAULT_SEO_THRESHOLDS, SHORT_TITLE_WIDTH_PX } from "./thresholds";

export const GENERATE_ENDPOINT_PATH = "/seo/generate";
export const DEFAULT_MODEL = "gpt-4o-mini";
export const DEFAULT_MAX_CONTENT_CHARS = 6000;

export const AVG_GLYPH_PX = 8.5;

export const TITLE_RANGE = {
  min: SHORT_TITLE_WIDTH_PX,
  max: DEFAULT_SEO_THRESHOLDS.titleWidth.max,
};

export const DESCRIPTION_RANGE = { ...DEFAULT_SEO_THRESHOLDS.metaDescriptionLength };

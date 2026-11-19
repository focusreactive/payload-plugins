/** The stylesheets a page type loads on top of the base one, as on the original site. */
export const SITE_TEMPLATE_STYLES = {
  blog: ["default", "blog"],
  default: ["default"],
  doctor: ["default", "doctor"],
  home: ["home"],
  location: ["default", "location"],
  locations: ["default", "locations"],
  post: ["default", "blog"],
  region: ["default", "region"],
  symptom: ["default", "symptom"],
  treatment: ["default"],
} as const;

export type SiteTemplate = keyof typeof SITE_TEMPLATE_STYLES;

export const SITE_TEMPLATES = Object.keys(SITE_TEMPLATE_STYLES) as SiteTemplate[];

export const isSiteTemplate = (value: unknown): value is SiteTemplate =>
  typeof value === "string" && value in SITE_TEMPLATE_STYLES;

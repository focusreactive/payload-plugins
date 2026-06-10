import type { Translations } from "../translations/types";

/** Client extractor: receives raw (unhydrated) form values, returns analyzed HTML. */
export type ExtractorFn = (data: Record<string, unknown>) => string | Promise<string>;

export interface SeoFieldPaths {
  /** Dot-path to the SEO title. Falls back to the collection useAsTitle / `title` if absent. */
  seoTitle?: string;
  /** Dot-path to the meta description. Absent → meta-desc checks disabled + snippet has no description. */
  metaDescription?: string;
  /**
   * Dot-path to the slug.
   * @default "slug"
   */
  slug?: string;
  /** Dot-path to the primary content field (blocks/richText/textarea). */
  content?: string;
}

export interface SeoCollectionConfig {
  slug: string;
  fields?: SeoFieldPaths;
  /**
   * importMap module-path string to a client extractor `(formData) => string | Promise<string>` (HTML).
   * Example: "@/seo/my-extractor#default".
   * @default built-in smart extractor
   */
  extractContentPath?: string;
}

export interface SeoSiteConfig {
  name?: string;
  baseUrl?: string;
  faviconUrl?: string;
}

export interface SeoPluginConfig {
  disabled?: boolean;
  collections: SeoCollectionConfig[];
  site?: SeoSiteConfig;
  supportedLocales?: string[];
  translations?: Translations;
}

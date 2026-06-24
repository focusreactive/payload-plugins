import type { ContentNode } from "../content/schema/nodes";
import type { Translations } from "../translations/types";

/** Runtime context handed to a content extractor so it can resolve references and locale-correct hrefs. */
export interface ExtractContext {
  /** Payload locale code (e.g. "en", "es"); absent → extractor falls back to its own default. */
  locale?: string;
  /** Payload REST API route (e.g. "/api") for client-side reference fetches. */
  apiRoute?: string;
}

/** Client extractor: receives hydrated, unflattened form values + runtime context, returns the content schema (Intermediate Representation). */
export type ContentExtractor = (values: Record<string, unknown>, ctx?: ExtractContext) => ContentNode[] | Promise<ContentNode[]>;

/** Which parts of the document the built-in extractor walks. */
export interface ContentSelection {
  /** Dot-paths to walk, in order. Omitted or empty = whole document root. */
  include?: string[];
  /** Dot-paths to skip (merged with auto-excluded seoTitle/metaDescription/slug). */
  exclude?: string[];
}

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
  /**
   * Built-in content selection. A string is a single field path.
   * An object selects include/exclude paths over the whole document.
   * Ignored when `extractContentPath` is set and registered.
   */
  content?: string | ContentSelection;
}

export interface SeoCollectionConfig {
  slug: string;
  fields?: SeoFieldPaths;
  /**
   * importMap path string used as the lookup key for a registered ContentExtractor (returns ContentNode[]).
   * Register the function via registerContentExtractors from "@focus-reactive/payload-plugin-seo/content".
   */
  extractContentPath?: string;
  /**
   * Depth of nested relation/upload resolution for the built-in extractor.
   * @default 2
   */
  resolveDepth?: number;
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

import type { ContentNode, HeadingLevel } from "../content/schema/nodes";
import type { Translations } from "../translations/types";

/** Runtime context handed to a content extractor so it can resolve references and locale-correct hrefs. */
export interface ExtractContext {
  /** Payload locale code (e.g. "en", "es"); absent → extractor falls back to its own default. */
  locale?: string;
  /** Payload REST API route (e.g. "/api") for client-side reference fetches. */
  apiRoute?: string;
}

/** Developer-authored extractor: raw form values + runtime ctx + injected toolkit → content schema (Intermediate Representation). */
export type ContentExtractor = (
  values: Record<string, unknown>,
  ctx: ExtractContext,
  toolkit: ExtractToolkit
) => ContentNode[] | Promise<ContentNode[]>;

export interface SeoFieldPaths {
  /** Dot-path to the SEO title. Falls back to `title` if absent. */
  seoTitle?: string;
  /** Dot-path to the meta description. Absent → meta-desc checks disabled + snippet has no description. */
  metaDescription?: string;
  /**
   * Dot-path to the slug.
   * @default "slug"
   */
  slug?: string;
}

export interface SeoCollectionConfig {
  slug: string;
  fields?: SeoFieldPaths;
  /**
   * importMap path string used as the lookup key for a registered ContentExtractor.
   * Register the function via registerContentExtractors from
   * "@focus-reactive/payload-plugin-seo/content" in an admin-mounted client module.
   */
  extractContentPath: string;
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

export interface DocQuery {
  collection: string;
  ids: (string | number)[];
  /** Payload field-projection: only these top-level fields are returned. */
  select?: string[];
  /** Payload relationship-population depth.
   * @default 0
   */
  depth?: number;
}

export interface DocStore {
  get(collection: string, id: string | number): Record<string, unknown> | undefined;
}

export interface ContentHelpers {
  heading: (level: HeadingLevel, text?: string | null) => ContentNode | null;
  paragraph: (text?: string | null) => ContentNode | null;
  link: (href?: string | null, text?: string | null) => ContentNode | null;
  image: (src?: string | null, alt?: string | null) => ContentNode | null;
  video: (src?: string | null, poster?: string | null) => ContentNode | null;
  html: (raw?: string | null) => ContentNode | null;
  richText: (value: unknown) => ContentNode | null;
  compact: (nodes: (ContentNode | null | undefined)[]) => ContentNode[];
}

export interface ExtractToolkit {
  resolveDocs: (queries: DocQuery[]) => Promise<DocStore>;
  helpers: ContentHelpers;
}

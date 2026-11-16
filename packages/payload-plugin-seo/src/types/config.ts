import type { PayloadRequest } from "payload";
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

export interface ResolveUrlArgs {
  doc: Record<string, unknown>;
  locale: string;
  req: PayloadRequest;
}

export type ResolveUrl = (args: ResolveUrlArgs) => string | null | Promise<string | null>;

export interface SeoCollectionConfig {
  slug: string;
  fields?: SeoFieldPaths;
  /**
   * importMap path string used as the lookup key for a registered ContentExtractor.
   * Register the function via registerContentExtractors from
   * "@focus-reactive/payload-plugin-seo/content" in an admin-mounted client module.
   */
  extractContentPath: string;
  /**
   * Server-side content extractor for on-publish generation. Same contract as the
   * client ContentExtractor, but `toolkit.resolveDocs` is backed by the Payload Local API and
   * `values` is the document being saved. May be the SAME function as the client extractor when
   * it only reads ids + injected resolveDocs (it is runtime-agnostic).
   */
  serverExtractContent?: ContentExtractor;
  resolveUrl?: ResolveUrl;
}

export interface SeoSiteConfig {
  name?: string;
  baseUrl?: string;
  faviconUrl?: string;
}

export interface SeoGenerationConfig {
  /** OpenAI chat model.
   * @default "gpt-4o-mini"
   */
  model?: string;
  /** Explicit API key.
   * @default process.env.OPENAI_API_KEY
   */
  apiKey?: string;
  /** Max chars of serialized page content sent to the model.
   * @default 6000
   */
  maxContentChars?: number;
  /** Override the system prompt for title generation. */
  titlePrompt?: string;
  /** Override the system prompt for description generation. */
  descriptionPrompt?: string;
}

/**
 * Bands of the analysis checks that show a gauge, in the units the editor sees. Every number is
 * optional; a missing one keeps the Yoast default. Language-specific Yoast settings (for example
 * character counts in Japanese) still take precedence in the languages they belong to.
 */
export interface SeoThresholds {
  /** Keyphrase length in words. */
  keyphraseLength?: {
    /**
     * Longest good keyphrase.
     * @default 4
     */
    max?: number;
    /**
     * Longest acceptable keyphrase; longer ones are bad.
     * @default 8
     */
    acceptableMax?: number;
  };
  /** Keyphrase density in percent of the text, for texts of at least 100 words. */
  keyphraseDensity?: {
    /**
     * Lowest good density.
     * @default 0.5
     */
    min?: number;
    /**
     * Highest good density.
     * @default 3
     */
    max?: number;
  };
  /** Meta description length in characters. */
  metaDescriptionLength?: {
    /**
     * Descriptions up to this length are too short.
     * @default 120
     */
    min?: number;
    /**
     * Descriptions over this length are too long.
     * @default 156
     */
    max?: number;
  };
  /** SEO title width in pixels. Titles up to 400px are short; that bound is fixed by Yoast. */
  titleWidth?: {
    /**
     * Titles wider than this are too long. Must be greater than 400.
     * @default 600
     */
    max?: number;
  };
  /** Text length in words. */
  textLength?: {
    /**
     * Texts with at least this many words are good.
     * @default 300
     */
    min?: number;
    /**
     * Texts with at least this many words are acceptable; shorter ones are bad.
     * @default 250
     */
    acceptableMin?: number;
  };
  /** Sentence length: the share of sentences longer than `maxSentenceWords`, in percent. */
  textSentenceLength?: {
    /**
     * Sentences with more words than this count as long.
     * @default 20
     */
    maxSentenceWords?: number;
    /**
     * Highest good share of long sentences.
     * @default 25
     */
    max?: number;
    /**
     * Highest acceptable share of long sentences; more is bad.
     * @default 30
     */
    acceptableMax?: number;
  };
  /** Flesch reading ease score (0–100, higher is easier). */
  fleschReadingEase?: {
    /**
     * Lowest good score.
     * @default 60
     */
    min?: number;
    /**
     * Lowest acceptable score; lower is bad.
     * @default 50
     */
    acceptableMin?: number;
  };
}

export type ResolvedSeoThresholds = {
  [Check in keyof SeoThresholds]-?: Required<NonNullable<SeoThresholds[Check]>>;
};

export interface SeoPluginConfig {
  disabled?: boolean;
  collections: SeoCollectionConfig[];
  site?: SeoSiteConfig;
  supportedLocales?: string[];
  translations?: Translations;
  generation?: SeoGenerationConfig;
  /**
   * Store keyphrases on the server in the hidden `seo-keyphrases` collection and enable the
   * "already used on" notice and the Internal links tab. Set to false to keep keyphrases in the
   * browser (localStorage) only.
   * @default true
   */
  keyphraseIndex?: boolean;
  /** Bands of the analysis checks that show a gauge. Defaults to the Yoast values. */
  thresholds?: SeoThresholds;
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

import type { PayloadRequest } from "payload";
import type { ContentNode, HeadingLevel } from "../content/schema/nodes";
import type { Translations } from "../translations/types";

export interface ExtractContext {
  locale?: string;
  apiRoute?: string;
}

export type ContentExtractor = (
  values: Record<string, unknown>,
  ctx: ExtractContext,
  toolkit: ExtractToolkit
) => ContentNode[] | Promise<ContentNode[]>;

export interface SeoFieldPaths {
  seoTitle?: string;
  metaDescription?: string;
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
  extractContentPath: string;
  serverExtractContent?: ContentExtractor;
  resolveUrl?: ResolveUrl;
}

export interface SeoSiteConfig {
  name?: string;
  baseUrl?: string;
  faviconUrl?: string;
}

export interface SeoGenerationConfig {
  model?: string;
  apiKey?: string;
  maxContentChars?: number;
  titlePrompt?: string;
  descriptionPrompt?: string;
}

export interface SeoThresholds {
  keyphraseLength?: {
    max?: number;
    acceptableMax?: number;
  };
  keyphraseDensity?: {
    min?: number;
    max?: number;
  };
  metaDescriptionLength?: {
    min?: number;
    max?: number;
  };
  titleWidth?: {
    max?: number;
  };
  textLength?: {
    min?: number;
    acceptableMin?: number;
  };
  textSentenceLength?: {
    maxSentenceWords?: number;
    max?: number;
    acceptableMax?: number;
  };
  fleschReadingEase?: {
    min?: number;
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
  keyphraseIndex?: boolean;
  thresholds?: SeoThresholds;
}

export interface DocQuery {
  collection: string;
  ids: (string | number)[];
  select?: string[];
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

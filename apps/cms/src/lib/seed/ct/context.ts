import type { Payload } from "payload";

import type { ImagesMap, ParsedPost, ParsedSite } from "./types";

export type StepName =
  | "media"
  | "taxonomy"
  | "users"
  | "posts"
  | "pages"
  | "chrome"
  | "redirects"
  | "presets"
  | "workflow";

/** Run order (T8): pages before chrome (links reference pages), redirects after both. */
export const STEP_ORDER: StepName[] = [
  "media",
  "taxonomy",
  "users",
  "posts",
  "pages",
  "chrome",
  "redirects",
  "presets",
  "workflow",
];

export interface SeedFlags {
  source: string;
  /** Root of the client sources: content dump, brand/, images-map.json, images/. */
  localDir: string;
  only: StepName[];
  limitPosts: number | null;
  allPosts: boolean;
  reset: boolean;
  /** Re-run the page recipes over pages that already exist (they are skipped otherwise). */
  rebuildPages: boolean;
}

export interface StepResult {
  created: number;
  updated: number;
  skipped: number;
  note?: string;
}

export interface SeedContext {
  payload: Payload;
  flags: SeedFlags;
  site: ParsedSite;
  /** Posts this run seeds (selection rule, --all-posts, --limit-posts). */
  posts: ParsedPost[];
  imagesMap: ImagesMap | null;
  /** Ids shared between steps (media keys, tag slugs, author names, page slugs…). */
  ids: {
    media: Map<string, number>;
    tags: Map<string, number>;
    authors: Map<string, number>;
    pages: Map<string, number>;
    posts: Map<string, number>;
  };
  /** Payload `context` for every write: no revalidation outside Next. */
  writeContext: Record<string, unknown>;
}

export type SeedStep = (ctx: SeedContext) => Promise<StepResult>;

export const emptyResult = (): StepResult => ({ created: 0, skipped: 0, updated: 0 });

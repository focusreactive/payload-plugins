import type { LocaleCode } from "./primitives.js";

/** What this installation's server can do. Every flag is always present; an absent control is not rendered. */
export type Abilities = {
  translate: boolean;
  cancel: boolean;
  runNow: boolean;
  staleness: boolean;
  translateField: boolean;
};

export type CollectionFacts = {
  /** Locales this collection is translated into when its source is published. Empty: auto-translate is off. */
  autoTranslateTargets: readonly LocaleCode[];
};

/** Reaches the admin once, through the provider's client props. */
export type TranslateKitConfig = {
  basePath: string;
  abilities: Abilities;
  collections: Readonly<Record<string, CollectionFacts>>;
};

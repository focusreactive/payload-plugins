import type { LocaleCode } from "./primitives.js";

export type Abilities = {
  translate: boolean;
  cancel: boolean;
  runNow: boolean;
  staleness: boolean;
  translateField: boolean;
};

export type CollectionFacts = {
  autoTranslateTargets: readonly LocaleCode[];
};

export type TranslateKitConfig = {
  basePath: string;
  abilities: Abilities;
  collections: Readonly<Record<string, CollectionFacts>>;
};

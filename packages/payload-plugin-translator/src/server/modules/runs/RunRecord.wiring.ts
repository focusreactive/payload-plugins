import type { ConfigModifier } from "../../../types/ConfigModifier.js";

import {
  DEFAULT_RUNS_SLUG,
  ensureRunRecordCollectionRegistered,
  isRunRecordCollection,
} from "./RunRecord.collection.js";
import { injectRunRecordCleanup } from "./RunRecordCleanup.hook.js";
import { PayloadRunRecordStore } from "./RunRecord.store.js";
import type { RunRecordStoreFactory } from "./RunRecord.store.js";
import { assertRunRecordSlugFree } from "./slugGuard.js";

export type RunsOption = { slug?: string } | undefined;

export type RunRecordContribution = {
  storeFactory: RunRecordStoreFactory;
  refuseACollidingSlug: ConfigModifier;
  addTheCollection: ConfigModifier;
  cleanUpOnDelete: (managedSlugs: Set<string>) => ConfigModifier;
};

export function configureRunRecord(option: RunsOption): RunRecordContribution {
  const slug = option?.slug || DEFAULT_RUNS_SLUG;

  const storeFactory: RunRecordStoreFactory = (payload, scope) =>
    new PayloadRunRecordStore(payload, slug, scope);

  const refuseACollidingSlug: ConfigModifier = (config) => {
    const theHostsOwn = (config.collections ?? []).filter(
      (collection) => !isRunRecordCollection(collection)
    );
    assertRunRecordSlugFree(slug, theHostsOwn);
    return config;
  };

  const addTheCollection: ConfigModifier = (config) => {
    ensureRunRecordCollectionRegistered(config, slug);
    return config;
  };

  const cleanUpOnDelete =
    (managedSlugs: Set<string>): ConfigModifier =>
    (config) => {
      injectRunRecordCleanup(config, managedSlugs, storeFactory, slug);
      return config;
    };

  return { storeFactory, refuseACollidingSlug, addTheCollection, cleanUpOnDelete };
}

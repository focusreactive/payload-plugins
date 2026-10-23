import type { Payload } from "payload";

import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap.js";
import type { ConfigModifier } from "../../../types/ConfigModifier.js";
import type { TranslationModule } from "../plugin-config/index.js";

import { provenanceModule } from "./Provenance.module.js";

import { ProvenanceService } from "./Provenance.service.js";
import { PayloadProvenanceStore } from "./Provenance.store.js";
import type { ProvenanceStoreFactory } from "./Provenance.store.js";
import { fetchSourceDocument } from "../../shared/payload/sourceDocument.js";
import type { RequestScope } from "../../shared/payload/RequestScope.shapes.js";
import type { SourceDocumentReader } from "./Provenance.shapes.js";
import {
  DEFAULT_PROVENANCE_SLUG,
  ensureProvenanceCollectionRegistered,
  isProvenanceCollection,
} from "./Provenance.collection.js";
import { injectProvenanceCleanup } from "./ProvenanceCleanup.hook.js";
import { assertProvenanceSlugFree } from "./slugGuard.js";

/** The opt-in `provenance` plugin option (kept local so this module doesn't depend on plugin.ts). */
export type ProvenanceOption = boolean | { slug?: string } | undefined;

/**
 * Resolve the opt-in `provenance` config to a sidecar slug, or `null` when disabled.
 * `false`/omitted → off; `true` or `{}` → on with the default slug; `{ slug }` → on with that slug.
 */
function resolveProvenanceSlug(option: ProvenanceOption): string | null {
  if (!option) return null;
  if (option === true) return DEFAULT_PROVENANCE_SLUG;
  return option.slug || DEFAULT_PROVENANCE_SLUG;
}

const OUTSIDE_THE_CALLERS_TRANSACTION = undefined;

/** The two things {@link ProvenanceService} needs from Payload, bound to one instance. */
export const provenanceIo = (payload: Payload) => ({
  logger: payload.logger,
  readSource: ({ collection, id, locale, user }: Parameters<SourceDocumentReader>[0]) =>
    fetchSourceDocument({
      payload,
      collection,
      id,
      locale,
      user,
      scope: OUTSIDE_THE_CALLERS_TRANSACTION,
    }),
});

export type ProvenanceServiceFactory = (
  payload: Payload,
  scope?: RequestScope
) => ProvenanceService;

export function configureProvenance(
  option: ProvenanceOption,
  schemaMap: CollectionSchemaMap
): TranslationModule | undefined {
  const slug = resolveProvenanceSlug(option);
  if (!slug) return undefined;

  const storeFactory: ProvenanceStoreFactory = (payload, scope) => {
    return new PayloadProvenanceStore(payload, slug, scope);
  };

  const serviceFactory: ProvenanceServiceFactory = (payload, scope = {}) => {
    const store = storeFactory(payload, scope);
    const io = provenanceIo(payload);
    return new ProvenanceService(store, schemaMap, scope, io);
  };

  const refuseACollidingSlug: ConfigModifier = (config) => {
    const theHostsOwn = (config.collections ?? []).filter(
      (collection) => !isProvenanceCollection(collection)
    );
    assertProvenanceSlugFree(slug, theHostsOwn);
    return config;
  };

  const addTheCollection: ConfigModifier = (config) => {
    ensureProvenanceCollectionRegistered(config, slug);
    return config;
  };

  const cleanUpOnDelete =
    (managedSlugs: Set<string>): ConfigModifier =>
    (config) => {
      injectProvenanceCleanup(config, managedSlugs, storeFactory, slug);
      return config;
    };

  return provenanceModule({
    serviceFactory,
    refuseACollidingSlug,
    addTheCollection,
    cleanUpOnDelete,
  });
}

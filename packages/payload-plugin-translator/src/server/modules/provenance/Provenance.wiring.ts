import type { Payload } from "payload";

import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap.js";
import type { ConfigModifier } from "../../../types/ConfigModifier.js";

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

/**
 * Everything the provenance module contributes at config time, in one object (mirrors
 * `TaskRunnerProvider.configure`): the request-scoped {@link ProvenanceService} factory used by the
 * handlers/routes, and the single {@link ConfigModifier} that registers the sidecar collection and
 * the cleanup hook. When provenance is disabled, `serviceFactory` is absent and `configure` is a no-op.
 */
export type ProvenanceModule = {
  serviceFactory?: ProvenanceServiceFactory;
  configure(managedSlugs: Set<string>): ConfigModifier;
};

const NOOP: ConfigModifier = (config) => config;

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

/**
 * Turn the opt-in `provenance` option into a self-contained {@link ProvenanceModule}. This is the one
 * place provenance's config-time wiring lives — `plugin.ts` only calls `configureProvenance(...)` and
 * registers the returned modifier through the shared builder (no raw `config.collections` mutation).
 */
export function configureProvenance(
  option: ProvenanceOption,
  schemaMap: CollectionSchemaMap
): ProvenanceModule {
  const slug = resolveProvenanceSlug(option);
  if (!slug) return { configure: () => NOOP };

  const storeFactory: ProvenanceStoreFactory = (payload, scope) =>
    new PayloadProvenanceStore(payload, slug, scope);

  const serviceFactory: ProvenanceServiceFactory = (payload, scope = {}) =>
    new ProvenanceService(storeFactory(payload, scope), schemaMap, scope, provenanceIo(payload));

  const configure =
    (managedSlugs: Set<string>): ConfigModifier =>
    (config) => {
      assertProvenanceSlugFree(
        slug,
        (config.collections ?? []).filter((collection) => !isProvenanceCollection(collection))
      );
      ensureProvenanceCollectionRegistered(config, slug);
      injectProvenanceCleanup(config, managedSlugs, storeFactory, slug);
      return config;
    };

  return { serviceFactory, configure };
}

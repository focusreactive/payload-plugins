import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap";
import type { ConfigModifier } from "../../../types/ConfigModifier";

import { ProvenanceService } from "./Provenance.service";
import type { ProvenanceServiceFactory } from "./Provenance.service";
import { PayloadProvenanceStore } from "./Provenance.store";
import type { ProvenanceStoreFactory } from "./Provenance.store";
import {
  DEFAULT_PROVENANCE_SLUG,
  ensureProvenanceCollectionRegistered,
  isProvenanceCollection,
} from "./Provenance.collection";
import { injectProvenanceCleanup } from "./ProvenanceCleanup.hook";
import { assertProvenanceSlugFree } from "./slugGuard";

/** The opt-in `provenance` plugin option (kept local so this module doesn't depend on plugin.ts). */
export type ProvenanceOption = boolean | { slug?: string } | undefined;

/**
 * Resolve the opt-in `provenance` config to a sidecar slug, or `null` when disabled.
 * `false`/omitted → off; `true` or `{}` → on with the default slug; `{ slug }` → on with that slug.
 */
function resolveProvenanceSlug(option: ProvenanceOption): string | null {
  if (!option) return null;
  if (option === true) return DEFAULT_PROVENANCE_SLUG;
  // `||` (not `??`) so an empty/blank slug falls back to the default instead of silently disabling.
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

  const storeFactory: ProvenanceStoreFactory = (payload) =>
    new PayloadProvenanceStore(payload, slug);
  const serviceFactory: ProvenanceServiceFactory = (payload) =>
    new ProvenanceService(payload, storeFactory(payload), schemaMap);

  const configure =
    (managedSlugs: Set<string>): ConfigModifier =>
    (config) => {
      // `config` infers as Payload's `Config` from the ConfigModifier return type, so this leaf never
      // names the god-type — it only reads/mutates through narrow helpers below.
      // Fail fast on a slug collision with a consumer collection (ignoring our own sidecar on a repeat
      // init, so an idempotent re-run doesn't false-positive).
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

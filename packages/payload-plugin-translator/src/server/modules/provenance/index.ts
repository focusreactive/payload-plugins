// Provenance adapter (Payload-backed). The framework-agnostic port + record types live in the core
// (src/core/domain/provenance); this module is the plugin-side implementation + its config-time wiring.
export {
  DEFAULT_PROVENANCE_SLUG,
  isProvenanceCollection,
  makeProvenanceCollection,
} from "./Provenance.collection";
export { PayloadProvenanceStore } from "./Provenance.store";
export type { ProvenanceStoreFactory } from "./Provenance.store";
export { injectProvenanceCleanup, makeProvenanceCleanupHook } from "./ProvenanceCleanup.hook";
export { assertProvenanceSlugFree } from "./slugGuard";
export { ProvenanceService } from "./Provenance.service";
export type { ProvenanceServiceFactory, StalenessLocale } from "./Provenance.service";
export { configureProvenance } from "./Provenance.wiring";
export type { ProvenanceModule, ProvenanceOption } from "./Provenance.wiring";

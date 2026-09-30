// Provenance adapter (Payload-backed). The framework-agnostic port + record types live in the core
// (src/core/domain/provenance); this module is the plugin-side implementation + its config-time wiring.
export {
  DEFAULT_PROVENANCE_SLUG,
  isProvenanceCollection,
  makeProvenanceCollection,
} from "./Provenance.collection.js";
export { PayloadProvenanceStore } from "./Provenance.store.js";
export type { ProvenanceStoreFactory } from "./Provenance.store.js";
export { injectProvenanceCleanup, makeProvenanceCleanupHook } from "./ProvenanceCleanup.hook.js";
export { assertProvenanceSlugFree } from "./slugGuard.js";
export { ProvenanceService } from "./Provenance.service.js";
export type { ProvenanceServiceFactory, StalenessLocale } from "./Provenance.service.js";
export { configureProvenance } from "./Provenance.wiring.js";
export type { ProvenanceModule, ProvenanceOption } from "./Provenance.wiring.js";

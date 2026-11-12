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
export { ProvenanceRecorder } from "./ProvenanceRecorder.service.js";
export { DocumentStaleness } from "./DocumentStaleness.service.js";
export type { LocaleStaleness } from "./DocumentStaleness.service.js";
export { PROVENANCE_MODULE, provenanceModule } from "./Provenance.module.js";
export { configureProvenance, documentStalenessIo, recorderIo } from "./Provenance.wiring.js";
export type {
  DocumentStalenessFactory,
  ProvenanceOption,
  ProvenanceRecorderFactory,
} from "./Provenance.wiring.js";

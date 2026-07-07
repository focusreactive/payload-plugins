// Provenance adapter (Payload-backed). The framework-agnostic port + record types live in the core
// (src/core/provenance); this module is the plugin-side implementation.
export {
  DEFAULT_PROVENANCE_SLUG,
  isProvenanceCollection,
  makeProvenanceCollection,
} from "./provenanceCollection";
export { PayloadProvenanceStore } from "./PayloadProvenanceStore";
export type { ProvenanceStoreFactory } from "./PayloadProvenanceStore";
export { injectProvenanceCleanup, makeProvenanceCleanupHook } from "./provenanceCleanupHook";
export { assertProvenanceSlugFree } from "./slugGuard";

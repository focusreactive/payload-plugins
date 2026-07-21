// Provenance contracts (port + record types) only — payload-free. The Payload-backed store lives
// in the plugin (src/server/modules/provenance), outside the core.
export type {
  ProvenanceKey,
  ProvenanceStore,
  TranslationProvenanceRecord,
} from "./ProvenanceStore.interface";
export { isRecordStale } from "./staleness";

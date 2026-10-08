export type {
  ProvenanceKey,
  ProvenanceReceipt,
  ProvenanceStore,
  TranslationProvenanceRecord,
} from "./ProvenanceStore.interface.js";
export type { CurrentFingerprint } from "./staleness.js";
export { changedLeaves, isRecordStale, recordsEachLeaf } from "./staleness.js";
export type { SourceFingerprint } from "./SourceFingerprint.js";
export {
  DECLINED,
  parseSourceFingerprint,
  serializeSourceFingerprint,
} from "./SourceFingerprint.js";

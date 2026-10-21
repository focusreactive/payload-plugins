export type {
  ProvenanceKey,
  ProvenanceReceipt,
  ProvenanceStore,
  TranslationProvenanceRecord,
} from "./ProvenanceStore.interface.js";
export type { CurrentFingerprint } from "./staleness.js";
export { changedLeaves, isRecordStale, recordsEachLeaf } from "./staleness.js";
export type { RecordedClaim, SourceFingerprint } from "./SourceFingerprint.js";
export {
  DECLINED,
  UNANSWERED,
  parseSourceFingerprint,
  serializeSourceFingerprint,
} from "./SourceFingerprint.js";

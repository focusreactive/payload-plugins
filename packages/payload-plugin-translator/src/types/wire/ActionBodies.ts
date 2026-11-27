import type { DocumentId, LeafAddress, LocaleCode } from "./primitives.js";

export type WireEnvelope<Body> = { data: Body };
export type RuleFilterBody = { kind: "rule"; name: string };
export type TranslationFilterBody = { kind: "leaves"; addresses: LeafAddress[] } | RuleFilterBody;

type EnqueueCommon = {
  source_lng: LocaleCode;
  target_lng: LocaleCode | LocaleCode[];
  collection_slug: string;
  publish_on_translation?: boolean;
};

export type EnqueueDocumentRequest = EnqueueCommon & {
  collection_id: [DocumentId];
  filters?: TranslationFilterBody[];
};

export type EnqueueListRequest = EnqueueCommon & {
  collection_id: [DocumentId, ...DocumentId[]];
  select_all?: boolean;
  filters?: RuleFilterBody[];
};

export type EnqueueAssignmentBody = {
  collection_slug: string;
  collection_id: DocumentId;
  target_lng: LocaleCode;
};

export type EnqueueResponse = {
  success: true;
  queued: number;
  refused?: readonly DocumentId[];
  busy?: readonly DocumentId[];
  assignments?: readonly EnqueueAssignmentBody[];
};

export type CancelRequest =
  | { collection_slug: string; collection_id: [DocumentId, ...DocumentId[]] }
  | { collection_slug: string; select_all: true };
export type CancelResponse = { refused: readonly DocumentId[] };

export type DismissStalenessRequest = {
  collection_slug: string;
  collection_id: DocumentId;
  target_lng: LocaleCode;
};

export type FieldTranslationRequest = {
  collection_slug: string;
  field_path: string;
  target_lng: LocaleCode;
  source_lng: LocaleCode;
  doc_id: DocumentId;
};

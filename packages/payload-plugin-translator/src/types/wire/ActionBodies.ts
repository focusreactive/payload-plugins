import type { DocumentId, LeafAddress, LocaleCode, RunHandle } from "./primitives.js";

/** Every 200 answer of the translator's routes wraps its body in `data`. */
export type WireEnvelope<Body> = { data: Body };

export type TranslationFilterBody =
  | { kind: "leaves"; addresses: LeafAddress[] }
  | { kind: "rule"; name: string };

/** `POST {basePath}/enqueue` */
export type EnqueueRequest = {
  source_lng: LocaleCode;
  target_lng: LocaleCode | LocaleCode[];
  collection_slug: string;
  collection_id: [DocumentId, ...DocumentId[]];
  select_all?: boolean;
  filters?: TranslationFilterBody[];
  publish_on_translation?: boolean;
};

export type EnqueueAssignmentBody = {
  collection_slug: string;
  collection_id: DocumentId;
  target_lng: LocaleCode;
  handle: RunHandle;
};

export type EnqueueResponse = {
  success: true;
  queued: number;
  /** Documents the caller may not update. */
  refused?: readonly DocumentId[];
  /** Documents that already have a live run; nothing was queued for them. */
  busy?: readonly DocumentId[];
  assignments?: readonly EnqueueAssignmentBody[];
};

/** `DELETE {basePath}/cancel` — answers 204, or 200 with the handles the caller may not stop. */
export type CancelRequest = { ids: RunHandle[] };
export type CancelResponse = { refused: readonly RunHandle[] };

/** `POST {basePath}/stale/dismiss` — answers 200 `{ success: true }`. */
export type DismissStalenessRequest = {
  collection_slug: string;
  collection_id: DocumentId;
  target_lng: LocaleCode;
};

/** `POST {basePath}/field` — answers `FieldTranslationResult`. */
export type FieldTranslationRequest = {
  collection_slug: string;
  field_path: string;
  target_lng: LocaleCode;
  source_lng: LocaleCode;
  doc_id: DocumentId;
};

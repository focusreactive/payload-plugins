import type { Payload, PayloadRequest } from "payload";

import type { BuildSchemaGraphOptions, GraphEdge, GraphNodeKind } from "../../graph/types.js";

export interface ReferencingDoc {
  /** Document id; for a global, its slug. */
  id: number | string;
  /** Value of the source collection's `admin.useAsTitle` (or the id when it has none). */
  title: string;
  /** The reference exists only in the latest draft, not in the published version. */
  draftOnly?: boolean;
}

export interface ReferenceSource {
  kind: GraphNodeKind;
  slug: string;
  label: string;
}

export interface ReferenceField {
  /** Display path; block slugs in brackets: `sections[content].articles`. */
  path: string;
  type: Exclude<GraphEdge["type"], "join">;
  hasMany: boolean;
  polymorphic: boolean;
  localized: boolean;
  /** Slugs of the blocks the field is nested in, outermost first. */
  blocks: string[];
}

/** All documents of one source collection (or one global) that point at the target via one field. */
export interface ReferenceGroup {
  source: ReferenceSource;
  field: ReferenceField;
  /** Number of referencing documents. `docs` holds at most `limit` of them. */
  totalDocs: number;
  docs: ReferencingDoc[];
  /**
   * `totalDocs` is a lower bound: the field was queried once per locale and/or draft state and
   * at least one of those queries had more matches than `limit`, so the union is not exact.
   */
  approximate?: boolean;
  /** Only the first `scanLimit` documents of the source collection were scanned. */
  partial?: boolean;
  /** The lookup for this field failed; `totalDocs` is 0 and `docs` is empty. */
  error?: string;
}

export interface ReferencesResult {
  collection: string;
  id: number | string;
  /** Sum of `totalDocs` over all groups — a document referencing via two fields counts twice. */
  total: number;
  /** Only fields with at least one reference, or whose lookup failed. */
  groups: ReferenceGroup[];
}

export interface FindReferencesArgs {
  /** Slug of the collection the document belongs to. */
  collection: string;
  id: number | string;
  /** Pass `req` inside hooks and endpoints (keeps the transaction and the user); otherwise `payload`. */
  req?: PayloadRequest;
  payload?: Payload;
  /** Maximum documents listed per field. Default `10`. */
  limit?: number;
  /**
   * Skip access control. Defaults to `true` like the Local API; the plugin's endpoint passes
   * `false` so users only see documents they can read.
   */
  overrideAccess?: boolean;
  /**
   * Fields inside blocks cannot be queried reliably on SQL adapters, so their collections are
   * scanned instead; this caps the documents scanned per collection and draft state.
   * Default `1000`.
   */
  scanLimit?: number;
  /** Also look in the latest drafts of collections/globals with drafts enabled. Default `true`. */
  includeDrafts?: boolean;
  /** Which collections/globals count as sources. Default: the plugin's own options. */
  graph?: BuildSchemaGraphOptions;
}

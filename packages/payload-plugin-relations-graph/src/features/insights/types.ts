export type FindingSeverity = "warning" | "info";

/** One thing worth a CMS lead's attention, found in the schema or in the live data. */
export interface Finding {
  /** Which check produced it, e.g. `required-cycle`, `unreferenced-uploads`. */
  check: string;
  detail: string;
  /** Edge ids (see `GraphEdge.id`) the finding is about. */
  edgeIds: string[];
  /** Stable across runs for the same schema/data: `<check>:<subject>`. */
  id: string;
  /** Node ids (see `GraphNode.id`) the finding is about. */
  nodeIds: string[];
  severity: FindingSeverity;
  /** `schema` findings need no database; `data` findings come from `/relations-graph/stats`. */
  source: "schema" | "data";
  title: string;
}

/** How a relation's fill rate was measured. */
export type EdgeStatsMethod =
  /** `payload.count` with a `where` on the field — exact at any size. */
  | "count"
  /** Documents read page by page (`select` + `depth: 0`) and the field inspected — exact up to `scanLimit`. */
  | "scan"
  /** The global document was read and inspected. */
  | "global";

export interface EdgeStats {
  /** Source documents that have the relation set (at least one value, in any locale). `null` = not measurable. */
  filled: number | null;
  method: EdgeStatsMethod | null;
  /** Why the numbers are `null`, when they are. */
  note?: string;
  /** Source documents considered (the source collection's count, or 1 for a global). */
  total: number | null;
}

export interface NodeStats {
  /** Documents in the collection the user can read; 1 for a global. `null` when the count failed. */
  total: number | null;
  /**
   * Documents no relation or upload field points to (references inside rich text are NOT
   * counted). Only computed for collections that some relation field targets; `null` when
   * not meaningful or not measurable — see `unreferencedNote`.
   */
  unreferenced: number | null;
  /**
   * `true` when some collection with a relation field pointing here could not be read by
   * this user, so `unreferenced` may be too high.
   */
  unreferencedIncomplete?: boolean;
  unreferencedNote?: string;
}

export interface RelationsStats {
  /** Caveats that apply to every number in the response. */
  caveats: string[];
  /** Keyed by edge id. Join edges are virtual and never listed. */
  edges: Record<string, EdgeStats>;
  generatedAt: string;
  /** Keyed by node id. */
  nodes: Record<string, NodeStats>;
  /** Max documents read per collection when a field has to be inspected document by document. */
  scanLimit: number;
  /** `true` when some collection hit `scanLimit`; the affected numbers are `null`. */
  truncated: boolean;
}

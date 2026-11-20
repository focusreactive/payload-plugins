export type GraphNodeKind = "collection" | "global";

export type GraphEdgeType = "relationship" | "upload" | "join";

export interface GraphNode {
  /** `collection:<slug>` or `global:<slug>` — unique across both kinds. */
  id: string;
  kind: GraphNodeKind;
  slug: string;
  label: string;
  /** Admin nav group, when the entity declares one. */
  group?: string;
  /** Number of data fields, counted through groups, tabs, arrays and blocks. */
  fieldCount: number;
  auth: boolean;
  upload: boolean;
  versions: boolean;
  /** Hidden from the admin nav (`admin.hidden`), e.g. plugin-internal collections. */
  hidden: boolean;
}

export interface GraphEdge {
  id: string;
  /** Node id of the entity that declares the field. */
  source: string;
  /** Node id of the collection the field points at. */
  target: string;
  type: GraphEdgeType;
  /** Human-readable field path; block slugs appear in brackets: `layout[hero].image`. */
  path: string;
  /** Dot path usable in a Payload `where` query: `layout.image`. */
  queryPath: string;
  hasMany: boolean;
  required: boolean;
  localized: boolean;
  /** The field accepts more than one collection (`relationTo: [...]`). */
  polymorphic: boolean;
  /** Slugs of the blocks the field is nested in, outermost first. */
  blocks: string[];
  /** For `join` fields: the field on the target collection that holds the relation. */
  on?: string;
}

export interface SchemaGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface BuildSchemaGraphOptions {
  /** Collection or global slugs to leave out of the graph. */
  exclude?: string[];
  /** Include globals as nodes. Default `true`. */
  includeGlobals?: boolean;
  /** Include collections and globals flagged `admin.hidden`. Default `false`. */
  includeHidden?: boolean;
}

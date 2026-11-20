export { relationsGraph } from "./plugin.js";
export type { RelationsGraphOptions } from "./types.js";
export { buildSchemaGraph } from "./graph/buildSchemaGraph.js";
export { layoutGraph } from "./graph/layout.js";
export { toMermaid } from "./graph/toMermaid.js";
export { toMarkdown } from "./graph/toMarkdown.js";
export { analyzeSchema } from "./features/insights/analyzeSchema.js";
export { analyzeStats } from "./features/insights/analyzeStats.js";
export type {
  EdgeStats,
  Finding,
  FindingSeverity,
  NodeStats,
  RelationsStats,
} from "./features/insights/types.js";
export type {
  BuildSchemaGraphOptions,
  GraphEdge,
  GraphEdgeType,
  GraphNode,
  GraphNodeKind,
  SchemaGraph,
} from "./graph/types.js";
export { findReferences } from "./features/references/index.js";
export type {
  FindReferencesArgs,
  ReferenceField,
  ReferenceGroup,
  ReferenceSource,
  ReferencesResult,
  ReferencingDoc,
} from "./features/references/index.js";

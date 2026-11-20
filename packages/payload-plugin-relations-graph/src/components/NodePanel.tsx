"use client";

import { Link } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";

import type { RelationsStats } from "../features/insights/types.js";
import type { GraphEdge, GraphNode, SchemaGraph } from "../graph/types.js";

const describe = (edge: GraphEdge): string =>
  [
    edge.type,
    edge.hasMany ? "many" : "one",
    edge.required ? "required" : undefined,
    edge.polymorphic ? "polymorphic" : undefined,
    edge.localized ? "localized" : undefined,
    edge.on ? `on ${edge.on}` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

const percent = (part: number, whole: number): string =>
  `${whole === 0 ? 0 : Math.round((part / whole) * 100)}%`;

/** "set on 2 of 3 articles (67%)" for a relation, from the source documents' point of view. */
const usage = (edge: GraphEdge, stats: RelationsStats, nodesById: Map<string, GraphNode>) => {
  if (edge.type === "join") {
    return null;
  }
  const entry = stats.edges[edge.id];
  if (!entry || entry.filled === null || entry.total === null) {
    return (
      <div className="rg__rel-usage rg__muted" title={entry?.note}>
        usage not measurable
      </div>
    );
  }
  const source = nodesById.get(edge.source);
  if (source?.kind === "global") {
    return <div className="rg__rel-usage">{entry.filled > 0 ? "set" : "empty"} in the global</div>;
  }
  const rate = entry.total === 0 ? 0 : entry.filled / entry.total;
  return (
    <div className="rg__rel-usage">
      <span className="rg__meter" aria-hidden="true">
        <span style={{ width: `${Math.round(rate * 100)}%` }} />
      </span>
      set on {entry.filled.toLocaleString("en-US")} of {entry.total.toLocaleString("en-US")}{" "}
      {source?.slug ?? ""} {entry.total > 0 ? `(${percent(entry.filled, entry.total)})` : ""}
    </div>
  );
};

interface RelationListProps {
  edges: GraphEdge[];
  nodesById: Map<string, GraphNode>;
  onSelect: (id: string) => void;
  /** Which end of the edge is "the other entity" in this list. */
  other: "source" | "target";
  stats?: RelationsStats | null;
}

const RelationList = ({ edges, nodesById, onSelect, other, stats }: RelationListProps) => {
  if (edges.length === 0) {
    return <p className="rg__muted">None</p>;
  }
  return (
    <ul className="rg__rel-list">
      {edges.map((edge) => (
        <li className="rg__rel" key={edge.id}>
          <div className="rg__rel-path">{edge.path}</div>
          <div>
            {other === "target" ? "→ " : "← "}
            <button className="rg__rel-target" onClick={() => onSelect(edge[other])} type="button">
              {nodesById.get(edge[other])?.label ?? edge[other]}
            </button>
          </div>
          <div className="rg__rel-meta">{describe(edge)}</div>
          {stats ? usage(edge, stats, nodesById) : null}
        </li>
      ))}
    </ul>
  );
};

interface NodePanelProps {
  adminRoute: string;
  graph: SchemaGraph;
  node: GraphNode;
  /** Shown as a "back" link when the panel replaced the insights list. */
  onBack?: () => void;
  onSelect: (id: string) => void;
  /** Live statistics, when the "Data" overlay is on. */
  stats?: RelationsStats | null;
}

const DataSummary = ({ node, stats }: { node: GraphNode; stats: RelationsStats }) => {
  const entry = stats.nodes[node.id];
  if (!entry || node.kind === "global") {
    return null;
  }
  const noun = node.upload ? "files" : "documents";
  return (
    <div className="rg__data-summary">
      <div>
        <strong>{entry.total === null ? "?" : entry.total.toLocaleString("en-US")}</strong> {noun}
      </div>
      {entry.unreferenced === null ? null : (
        <div>
          <strong>{entry.unreferenced.toLocaleString("en-US")}</strong> not referenced by any
          relation field{entry.unreferencedIncomplete ? " (may be fewer)" : ""}
          <div className="rg__muted rg__small">
            References inside rich text are not counted.
            {entry.unreferencedIncomplete ? ` ${entry.unreferencedNote ?? ""}` : ""}
          </div>
        </div>
      )}
    </div>
  );
};

export const NodePanel = ({ adminRoute, graph, node, onBack, onSelect, stats }: NodePanelProps) => {
  const nodesById = new Map(graph.nodes.map((item) => [item.id, item]));
  const outgoing = graph.edges.filter((edge) => edge.source === node.id);
  const incoming = graph.edges.filter((edge) => edge.target === node.id);
  const badges = [
    node.kind,
    `${node.fieldCount} fields`,
    node.upload ? "upload" : undefined,
    node.auth ? "auth" : undefined,
    node.versions ? "versions" : undefined,
    node.group,
  ].filter(Boolean);
  const href = formatAdminURL({
    adminRoute,
    path: `/${node.kind === "collection" ? "collections" : "globals"}/${node.slug}`,
  });

  return (
    <aside aria-label={`${node.label} details`} className="rg__panel">
      {onBack ? (
        <button className="rg__back" onClick={onBack} type="button">
          ← Insights
        </button>
      ) : null}
      <h3>{node.label}</h3>
      <div className="rg__panel-slug">{node.slug}</div>
      <div className="rg__badges">
        {badges.map((badge) => (
          <span className="rg__badge" key={badge}>
            {badge}
          </span>
        ))}
      </div>
      {stats ? <DataSummary node={node} stats={stats} /> : null}

      <h4>Points to ({outgoing.length})</h4>
      <RelationList
        edges={outgoing}
        nodesById={nodesById}
        onSelect={onSelect}
        other="target"
        stats={stats}
      />

      <h4>Referenced by ({incoming.length})</h4>
      <RelationList
        edges={incoming}
        nodesById={nodesById}
        onSelect={onSelect}
        other="source"
        stats={stats}
      />

      <Link className="rg__panel-link" href={href} prefetch={false}>
        Open {node.kind} →
      </Link>
    </aside>
  );
};

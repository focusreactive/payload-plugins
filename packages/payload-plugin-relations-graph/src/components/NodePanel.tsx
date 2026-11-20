"use client";

import { Link } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";

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

interface RelationListProps {
  edges: GraphEdge[];
  nodesById: Map<string, GraphNode>;
  onSelect: (id: string) => void;
  /** Which end of the edge is "the other entity" in this list. */
  other: "source" | "target";
}

const RelationList = ({ edges, nodesById, onSelect, other }: RelationListProps) => {
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
        </li>
      ))}
    </ul>
  );
};

interface NodePanelProps {
  adminRoute: string;
  graph: SchemaGraph;
  node: GraphNode;
  onSelect: (id: string) => void;
}

export const NodePanel = ({ adminRoute, graph, node, onSelect }: NodePanelProps) => {
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
      <h3>{node.label}</h3>
      <div className="rg__panel-slug">{node.slug}</div>
      <div className="rg__badges">
        {badges.map((badge) => (
          <span className="rg__badge" key={badge}>
            {badge}
          </span>
        ))}
      </div>

      <h4>Points to ({outgoing.length})</h4>
      <RelationList edges={outgoing} nodesById={nodesById} onSelect={onSelect} other="target" />

      <h4>Referenced by ({incoming.length})</h4>
      <RelationList edges={incoming} nodesById={nodesById} onSelect={onSelect} other="source" />

      <Link className="rg__panel-link" href={href} prefetch={false}>
        Open {node.kind} →
      </Link>
    </aside>
  );
};

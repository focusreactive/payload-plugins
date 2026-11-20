import { Link } from "@payloadcms/ui";
import type { WidgetServerProps } from "payload";
import { formatAdminURL } from "payload/shared";

import { layoutGraph, NODE_HEIGHT, NODE_WIDTH } from "../graph/layout.js";
import type { SchemaGraph } from "../graph/types.js";
import { getVisibleGraph } from "../lib/getVisibleGraph.js";
import { getOptions } from "../lib/options.js";
import { groupLinks, linkLabel, linkShape, linkType } from "./geometry.js";
import { GRAPH_CSS } from "./styles.js";

interface WidgetSettings {
  globals?: boolean;
  uploads?: boolean;
}

const PADDING = 48;

const truncate = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? "" : "s"}`;

/**
 * Dashboard widget: the relations graph as a static picture.
 *
 * Rendered entirely on the server from the Payload config — no database query and no client
 * JavaScript. Each box links to its collection; the heading links to the interactive view.
 */
export const RelationsGraphWidget = ({ permissions, req, widgetData }: WidgetServerProps) => {
  const settings = (widgetData ?? {}) as WidgetSettings;
  const { config } = req.payload;
  const full = getVisibleGraph(req, permissions);

  const nodes = full.nodes.filter(
    (node) =>
      (settings.globals !== false || node.kind !== "global") &&
      (settings.uploads !== false || !node.upload)
  );
  const ids = new Set(nodes.map((node) => node.id));
  const graph: SchemaGraph = {
    edges: full.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)),
    nodes,
  };

  const positions = layoutGraph(graph);
  const links = groupLinks(graph.edges);
  const points = Object.values(positions);
  const minX = Math.min(...points.map((point) => point.x)) - NODE_WIDTH / 2 - PADDING;
  const maxX = Math.max(...points.map((point) => point.x)) + NODE_WIDTH / 2 + PADDING;
  // Extra room on top: self-reference loops rise above their box.
  const minY = Math.min(...points.map((point) => point.y)) - NODE_HEIGHT / 2 - PADDING - 30;
  const maxY = Math.max(...points.map((point) => point.y)) + NODE_HEIGHT / 2 + PADDING;

  const collections = nodes.filter((node) => node.kind === "collection").length;
  const globals = nodes.length - collections;
  const viewHref = formatAdminURL({
    adminRoute: config.routes.admin,
    path: getOptions(config).path,
  });

  return (
    <div className="rg rg--widget">
      <style href="payload-relations-graph" precedence="default">
        {GRAPH_CSS}
      </style>
      <div className="rg__widget-header">
        <h3 className="rg__widget-title">Content model</h3>
        <span className="rg__summary">
          {plural(collections, "collection")}
          {globals > 0 ? ` · ${plural(globals, "global")}` : ""} ·{" "}
          {plural(graph.edges.length, "relation")}
        </span>
        <Link className="rg__widget-link" href={viewHref} prefetch={false}>
          Open graph →
        </Link>
      </div>

      {nodes.length === 0 ? (
        <p className="rg__muted">No collections to show.</p>
      ) : (
        <svg
          aria-label="Graph of collections and the relations between them"
          className="rg__widget-svg"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
        >
          <defs>
            {(["relationship", "upload", "join"] as const).map((type) => (
              <marker
                id={`rgw-arrow-${type}`}
                key={type}
                markerHeight="8"
                markerUnits="userSpaceOnUse"
                markerWidth="8"
                orient="auto-start-reverse"
                refX="7"
                refY="4"
                viewBox="0 0 8 8"
              >
                <path
                  d="M 0 0 L 8 4 L 0 8 z"
                  fill={`var(--rg-${type === "relationship" ? "rel" : type})`}
                />
              </marker>
            ))}
          </defs>

          {links.map((link) => {
            const source = positions[link.source];
            const target = positions[link.target];
            if (!source || !target) {
              return null;
            }
            const shape = linkShape(source, target, link);
            const type = linkType(link);
            return (
              <g key={link.id}>
                <path
                  className={`rg__edge rg__edge--${type}`}
                  d={shape.d}
                  markerEnd={`url(#rgw-arrow-${type})`}
                />
                <text
                  className="rg__edge-label"
                  textAnchor="middle"
                  x={shape.label.x}
                  y={shape.label.y - 5}
                >
                  {truncate(linkLabel(link), 26)}
                </text>
              </g>
            );
          })}

          {nodes.map((node) => {
            const position = positions[node.id];
            if (!position) {
              return null;
            }
            const href = formatAdminURL({
              adminRoute: config.routes.admin,
              path: `/${node.kind === "collection" ? "collections" : "globals"}/${node.slug}`,
            });
            return (
              <a
                className={`rg__node rg__node--${node.kind}${node.upload ? " rg__node--upload" : ""}`}
                href={href}
                key={node.id}
              >
                <g
                  transform={`translate(${position.x - NODE_WIDTH / 2} ${position.y - NODE_HEIGHT / 2})`}
                >
                  <title>{`${node.label} (${node.slug})`}</title>
                  <rect className="rg__node-box" height={NODE_HEIGHT} rx="6" width={NODE_WIDTH} />
                  <rect
                    className="rg__node-stripe"
                    height={NODE_HEIGHT - 16}
                    rx="2"
                    width="4"
                    x="8"
                    y="8"
                  />
                  <text className="rg__node-label" x="22" y="25">
                    {truncate(node.label, 19)}
                  </text>
                  <text className="rg__node-meta" x="22" y="43">
                    {node.kind === "global" ? "global · " : ""}
                    {plural(node.fieldCount, "field")}
                  </text>
                </g>
              </a>
            );
          })}
        </svg>
      )}
    </div>
  );
};

import { NODE_HEIGHT, NODE_WIDTH } from "../graph/layout.js";
import type { Point } from "../graph/layout.js";
import type { RelationsStats } from "../features/insights/types.js";
import type { GraphEdge } from "../graph/types.js";

/** Several fields between the same two entities are drawn as one line. */
export interface VisualLink {
  edges: GraphEdge[];
  id: string;
  /** A link also runs the other way, so both must bow apart. */
  mutual: boolean;
  source: string;
  target: string;
}

export const groupLinks = (edges: GraphEdge[]): VisualLink[] => {
  const links = new Map<string, VisualLink>();
  for (const edge of edges) {
    const id = `${edge.source}>${edge.target}`;
    const link = links.get(id);
    if (link) {
      link.edges.push(edge);
    } else {
      links.set(id, { edges: [edge], id, mutual: false, source: edge.source, target: edge.target });
    }
  }
  for (const link of links.values()) {
    link.mutual = link.source !== link.target && links.has(`${link.target}>${link.source}`);
  }
  return [...links.values()];
};

/** Where the ray from a node's centre towards `toward` leaves the node's box. */
const borderPoint = (center: Point, toward: Point, pad = 0): Point => {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  if (dx === 0 && dy === 0) {
    return center;
  }
  const halfW = NODE_WIDTH / 2 + pad;
  const halfH = NODE_HEIGHT / 2 + pad;
  const scale = Math.min(halfW / Math.abs(dx || 1e-9), halfH / Math.abs(dy || 1e-9));
  return { x: center.x + dx * scale, y: center.y + dy * scale };
};

export interface LinkShape {
  d: string;
  label: Point;
}

export const linkShape = (source: Point, target: Point, link: VisualLink): LinkShape => {
  if (link.source === link.target) {
    // Self-reference: a loop off the top-right corner.
    const x = source.x + NODE_WIDTH / 2;
    const y = source.y - NODE_HEIGHT / 2;
    return {
      d: `M ${x - 34} ${y} C ${x - 34} ${y - 50}, ${x + 50} ${y - 50}, ${x + 50} ${y + 14} C ${x + 50} ${y + 30}, ${x + 20} ${y + 24}, ${x + 4} ${y + 20}`,
      label: { x: x + 8, y: y - 44 },
    };
  }

  const mid = { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const bow = link.mutual ? 34 : 0;
  const control = { x: mid.x - (dy / length) * bow, y: mid.y + (dx / length) * bow };
  const start = borderPoint(source, control);
  const end = borderPoint(target, control, 4);

  return {
    d: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
    label: {
      x: 0.25 * start.x + 0.5 * control.x + 0.25 * end.x,
      y: 0.25 * start.y + 0.5 * control.y + 0.25 * end.y,
    },
  };
};

export const linkLabel = (link: VisualLink): string => {
  if (link.edges.length > 1) {
    return `${link.edges.length} fields`;
  }
  const [edge] = link.edges;
  const name = edge?.path.split(".").at(-1) ?? "";
  return edge?.hasMany ? `${name} [ ]` : name;
};

/** Dominant line style of a grouped link: a real relation outranks an upload, which outranks a join. */
export const linkType = (link: VisualLink): GraphEdge["type"] => {
  if (link.edges.some((edge) => edge.type === "relationship")) {
    return "relationship";
  }
  return link.edges.some((edge) => edge.type === "upload") ? "upload" : "join";
};

/**
 * Share of source documents in which the link's relation is set (0–1). For a link bundling
 * several fields, the best-filled one counts. `null` for joins or when nothing is measurable.
 */
export const linkFillRate = (link: VisualLink, stats: RelationsStats): number | null => {
  let best: number | null = null;
  for (const edge of link.edges) {
    const entry = edge.type === "join" ? undefined : stats.edges[edge.id];
    if (entry && entry.filled !== null && entry.total !== null && entry.total > 0) {
      best = Math.max(best ?? 0, entry.filled / entry.total);
    }
  }
  return best;
};

export interface Viewport {
  k: number;
  x: number;
  y: number;
}

const OVERLAY_HEIGHT = 48;

export const fitViewport = (
  positions: Record<string, Point>,
  ids: string[],
  width: number,
  height: number
): Viewport => {
  const points = ids.flatMap((id) => {
    const point = positions[id];
    return point ? [point] : [];
  });
  if (points.length === 0 || width === 0 || height === 0) {
    return { k: 1, x: width / 2, y: height / 2 };
  }
  const minX = Math.min(...points.map((point) => point.x)) - NODE_WIDTH / 2 - 60;
  const maxX = Math.max(...points.map((point) => point.x)) + NODE_WIDTH / 2 + 60;
  const minY = Math.min(...points.map((point) => point.y)) - NODE_HEIGHT / 2 - 70;
  const maxY = Math.max(...points.map((point) => point.y)) + NODE_HEIGHT / 2 + 60;
  // Keep the bottom strip free: the legend and zoom buttons float there.
  const usable = Math.max(1, height - OVERLAY_HEIGHT);
  const k = Math.min(1.25, width / (maxX - minX), usable / (maxY - minY));
  return {
    k,
    x: width / 2 - ((minX + maxX) / 2) * k,
    y: usable / 2 - ((minY + maxY) / 2) * k,
  };
};

import type { SchemaGraph } from "./types.js";

export interface Point {
  x: number;
  y: number;
}

export const NODE_WIDTH = 184;
export const NODE_HEIGHT = 58;

const IDEAL_DISTANCE = 290;
const ITERATIONS = 300;
/** Vertical distances count for more: boxes are wide and short, so rows can sit closer. */
const ASPECT = 1.7;
const COMPONENT_GAP = 90;
const ROW_WIDTH = 1500;

/** Nudge apart any boxes that ended up closer than a comfortable margin (room for edge labels). */
const separate = (ids: string[], positions: Map<string, Point>): void => {
  const minX = NODE_WIDTH + 70;
  const minY = NODE_HEIGHT + 64;
  for (let pass = 0; pass < 60; pass += 1) {
    let moved = false;
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const a = positions.get(ids[i] as string) as Point;
        const b = positions.get(ids[j] as string) as Point;
        const overlapX = minX - Math.abs(a.x - b.x);
        const overlapY = minY - Math.abs(a.y - b.y);
        if (overlapX <= 0 || overlapY <= 0) {
          continue;
        }
        moved = true;
        // Resolve along the axis that needs the smaller shift.
        if (overlapY <= overlapX) {
          const shift = (overlapY / 2 + 1) * (a.y <= b.y ? -1 : 1);
          a.y += shift;
          b.y -= shift;
        } else {
          const shift = (overlapX / 2 + 1) * (a.x <= b.x ? -1 : 1);
          a.x += shift;
          b.x -= shift;
        }
      }
    }
    if (!moved) {
      break;
    }
  }
};

/** Force-directed (Fruchterman–Reingold) placement of one connected group, centred on 0,0. */
const layoutComponent = (
  ids: string[],
  links: [string, string][],
  degree: Map<string, number>
): Map<string, Point> => {
  const positions = new Map<string, Point>();
  if (ids.length === 1) {
    positions.set(ids[0] as string, { x: 0, y: 0 });
    return positions;
  }

  // Hubs first, alternated around the circle so they don't start side by side.
  const ordered = ids.toSorted(
    (a, b) => (degree.get(b) ?? 0) - (degree.get(a) ?? 0) || a.localeCompare(b)
  );
  const radius = Math.max(IDEAL_DISTANCE * 0.6, (ordered.length * IDEAL_DISTANCE) / (2 * Math.PI));
  for (const [index, id] of ordered.entries()) {
    const slot = index % 2 === 0 ? index / 2 : ordered.length - (index + 1) / 2;
    const angle = (2 * Math.PI * slot) / ordered.length;
    const pull = 1 - Math.min(0.7, (degree.get(id) ?? 0) * 0.14);
    positions.set(id, {
      x: Math.cos(angle) * radius * pull,
      y: (Math.sin(angle) * radius * pull) / ASPECT,
    });
  }

  let temperature = radius / 2;
  const cooling = temperature / (ITERATIONS + 1);

  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
    const displacement = new Map<string, Point>(ordered.map((id) => [id, { x: 0, y: 0 }]));

    for (let i = 0; i < ordered.length; i += 1) {
      for (let j = i + 1; j < ordered.length; j += 1) {
        const a = positions.get(ordered[i] as string) as Point;
        const b = positions.get(ordered[j] as string) as Point;
        let dx = a.x - b.x;
        let dy = (a.y - b.y) * ASPECT;
        if (dx === 0 && dy === 0) {
          dx = 0.01 * (i + 1);
          dy = 0.01 * (j + 1);
        }
        const distance = Math.max(1, Math.hypot(dx, dy));
        const force = (IDEAL_DISTANCE * IDEAL_DISTANCE) / distance;
        const da = displacement.get(ordered[i] as string) as Point;
        const db = displacement.get(ordered[j] as string) as Point;
        da.x += (dx / distance) * force;
        da.y += (dy / distance) * force;
        db.x -= (dx / distance) * force;
        db.y -= (dy / distance) * force;
      }
    }

    for (const [source, target] of links) {
      const a = positions.get(source) as Point;
      const b = positions.get(target) as Point;
      const dx = a.x - b.x;
      const dy = (a.y - b.y) * ASPECT;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const force = (distance * distance) / IDEAL_DISTANCE;
      const da = displacement.get(source) as Point;
      const db = displacement.get(target) as Point;
      da.x -= (dx / distance) * force;
      da.y -= (dy / distance) * force;
      db.x += (dx / distance) * force;
      db.y += (dy / distance) * force;
    }

    for (const id of ordered) {
      const position = positions.get(id) as Point;
      const delta = displacement.get(id) as Point;
      const length = Math.max(1, Math.hypot(delta.x, delta.y));
      const step = Math.min(length, temperature);
      position.x += (delta.x / length) * step;
      position.y += ((delta.y / length) * step) / ASPECT;
    }

    temperature -= cooling;
  }

  separate(ordered, positions);
  return positions;
};

interface Box {
  height: number;
  ids: string[];
  minX: number;
  minY: number;
  positions: Map<string, Point>;
  width: number;
}

const toBox = (ids: string[], positions: Map<string, Point>): Box => {
  const points = ids.map((id) => positions.get(id) as Point);
  const minX = Math.min(...points.map((point) => point.x)) - NODE_WIDTH / 2;
  const maxX = Math.max(...points.map((point) => point.x)) + NODE_WIDTH / 2;
  const minY = Math.min(...points.map((point) => point.y)) - NODE_HEIGHT / 2;
  const maxY = Math.max(...points.map((point) => point.y)) + NODE_HEIGHT / 2;
  return { height: maxY - minY, ids, minX, minY, positions, width: maxX - minX };
};

/**
 * Deterministic layout: each connected group of entities is arranged force-directed, then the
 * groups are packed in rows, largest first — so unrelated collections line up tidily below the
 * main cluster instead of drifting away. No randomness: same schema, same picture.
 */
export const layoutGraph = (graph: SchemaGraph): Record<string, Point> => {
  const { nodes, edges } = graph;
  const degree = new Map<string, number>(nodes.map((node) => [node.id, 0]));
  const parent = new Map<string, string>(nodes.map((node) => [node.id, node.id]));
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) {
      root = parent.get(root) as string;
    }
    parent.set(id, root);
    return root;
  };

  const links = new Map<string, [string, string]>();
  for (const edge of edges) {
    if (edge.source === edge.target || !degree.has(edge.source) || !degree.has(edge.target)) {
      continue;
    }
    const key = [edge.source, edge.target].toSorted().join("|");
    if (!links.has(key)) {
      links.set(key, [edge.source, edge.target]);
      degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
      degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
      parent.set(find(edge.source), find(edge.target));
    }
  }

  const components = new Map<string, string[]>();
  for (const node of nodes) {
    const root = find(node.id);
    components.set(root, [...(components.get(root) ?? []), node.id]);
  }

  const boxes = [...components.values()]
    .map((ids) => {
      const members = new Set(ids);
      const own = [...links.values()].filter(([source]) => members.has(source));
      return toBox(ids, layoutComponent(ids, own, degree));
    })
    .toSorted(
      (a, b) =>
        b.ids.length - a.ids.length || (a.ids[0] as string).localeCompare(b.ids[0] as string)
    );

  const result: Record<string, Point> = {};
  const rowWidth = Math.max(ROW_WIDTH, boxes[0]?.width ?? 0);
  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;
  for (const box of boxes) {
    if (cursorX > 0 && cursorX + box.width > rowWidth) {
      cursorX = 0;
      cursorY += rowHeight + COMPONENT_GAP;
      rowHeight = 0;
    }
    for (const id of box.ids) {
      const point = box.positions.get(id) as Point;
      result[id] = {
        x: Math.round(point.x - box.minX + cursorX),
        y: Math.round(point.y - box.minY + cursorY),
      };
    }
    cursorX += box.width + COMPONENT_GAP;
    rowHeight = Math.max(rowHeight, box.height);
  }
  return result;
};

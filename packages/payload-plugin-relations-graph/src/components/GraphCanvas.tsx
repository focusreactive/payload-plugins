"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { analyzeSchema, sortFindings } from "../features/insights/analyzeSchema.js";
import { analyzeStats } from "../features/insights/analyzeStats.js";
import type { Finding, RelationsStats } from "../features/insights/types.js";
import { NODE_HEIGHT, NODE_WIDTH } from "../graph/layout.js";
import type { Point } from "../graph/layout.js";
import { toMarkdown } from "../graph/toMarkdown.js";
import { toMermaid } from "../graph/toMermaid.js";
import type { GraphNode, SchemaGraph } from "../graph/types.js";
import { ENDPOINT_BASE } from "../lib/constants.js";
import {
  fitViewport,
  groupLinks,
  linkFillRate,
  linkLabel,
  linkShape,
  linkType,
} from "./geometry.js";
import type { Viewport } from "./geometry.js";
import { InsightsPanel } from "./InsightsPanel.js";
import type { StatsState } from "./InsightsPanel.js";
import { NodePanel } from "./NodePanel.js";
import { GRAPH_CSS } from "./styles.js";

const STORAGE_KEY = "payload-relations-graph:positions";
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.5;

const readStoredPositions = (): Record<string, Point> => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Point>) : {};
  } catch {
    return {};
  }
};

const storePositions = (positions: Record<string, Point> | null): void => {
  try {
    if (positions) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage may be unavailable (private mode); the layout just won't persist.
  }
};

const truncate = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

const relationsText = (count: number): string =>
  `${count} ${count === 1 ? "relation" : "relations"}`;

const nodeMeta = (node: GraphNode, relationCount: number, stats: RelationsStats | null): string => {
  const entry = stats?.nodes[node.id];
  if (!entry || node.kind === "global") {
    return `${node.kind === "global" ? "global · " : ""}${node.fieldCount} fields · ${relationsText(relationCount)}`;
  }
  const total =
    entry.total === null
      ? "? docs"
      : `${entry.total.toLocaleString("en-US")} ${node.upload ? "files" : "docs"}`;
  return entry.unreferenced
    ? `${total} · ${entry.unreferenced.toLocaleString("en-US")} unreferenced`
    : `${total} · ${relationsText(relationCount)}`;
};

const percentText = (rate: number): string => `${Math.round(rate * 100)}%`;

type Drag =
  | { kind: "pan"; origin: Point; start: Viewport }
  | { id: string; kind: "node"; moved: boolean; origin: Point; start: Point };

export interface GraphCanvasProps {
  adminRoute: string;
  apiRoute: string;
  graph: SchemaGraph;
  initialPositions: Record<string, Point>;
  /** Whether the insights feature (health checks, live data statistics) is enabled. */
  insights?: boolean;
  title: string;
}

export const GraphCanvas = ({
  adminRoute,
  apiRoute,
  graph,
  initialPositions,
  insights = false,
  title,
}: GraphCanvasProps) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const fittedRef = useRef(false);

  const [positions, setPositions] = useState(initialPositions);
  const [viewport, setViewport] = useState<Viewport>({ k: 1, x: 0, y: 0 });
  const [size, setSize] = useState({ height: 0, width: 0 });
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showGlobals, setShowGlobals] = useState(true);
  const [showUploads, setShowUploads] = useState(true);
  const [panning, setPanning] = useState(false);
  const [copied, setCopied] = useState<"ai" | "mermaid" | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [activeFinding, setActiveFinding] = useState<string | null>(null);
  const [dataOn, setDataOn] = useState(false);
  const [statsState, setStatsState] = useState<StatsState>({ status: "idle" });
  const [stats, setStats] = useState<RelationsStats | null>(null);

  const loadStats = useCallback(async () => {
    setDataOn(true);
    setStatsState({ status: "loading" });
    try {
      const response = await fetch(`${apiRoute}${ENDPOINT_BASE}/stats`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`.trim());
      }
      setStats((await response.json()) as RelationsStats);
      setStatsState({ status: "ready" });
    } catch (error) {
      setStatsState({
        message: error instanceof Error ? error.message : "request failed",
        status: "error",
      });
    }
  }, [apiRoute]);

  const toggleData = () => {
    if (dataOn) {
      setDataOn(false);
    } else if (stats) {
      setDataOn(true);
    } else {
      void loadStats();
    }
  };

  const findings = useMemo<Finding[]>(() => {
    if (!insights) {
      return [];
    }
    const schema = analyzeSchema(graph);
    return stats ? sortFindings([...schema, ...analyzeStats(graph, stats)]) : schema;
  }, [graph, insights, stats]);

  const finding = insightsOpen ? findings.find((item) => item.id === activeFinding) : undefined;
  const warningNodes = useMemo(
    () =>
      new Set(
        findings.filter((item) => item.severity === "warning").flatMap((item) => item.nodeIds)
      ),
    [findings]
  );
  const shownStats = dataOn ? stats : null;

  const visible = useMemo<SchemaGraph>(() => {
    const nodes = graph.nodes.filter(
      (node) => (showGlobals || node.kind !== "global") && (showUploads || !node.upload)
    );
    const ids = new Set(nodes.map((node) => node.id));
    return {
      edges: graph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)),
      nodes,
    };
  }, [graph, showGlobals, showUploads]);

  const links = useMemo(() => groupLinks(visible.edges), [visible.edges]);

  const relationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const edge of visible.edges) {
      counts.set(edge.source, (counts.get(edge.source) ?? 0) + 1);
      if (edge.target !== edge.source) {
        counts.set(edge.target, (counts.get(edge.target) ?? 0) + 1);
      }
    }
    return counts;
  }, [visible.edges]);

  const fit = useCallback(
    (source: Record<string, Point>) => {
      setViewport(
        fitViewport(
          source,
          visible.nodes.map((node) => node.id),
          size.width,
          size.height
        )
      );
    },
    [size.height, size.width, visible.nodes]
  );

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setSize({ height: entry.contentRect.height, width: entry.contentRect.width });
      }
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  // First paint with a known size: restore dragged positions, then frame the whole graph.
  useEffect(() => {
    if (fittedRef.current || size.width === 0) {
      return;
    }
    fittedRef.current = true;
    const merged = { ...initialPositions };
    for (const [id, point] of Object.entries(readStoredPositions())) {
      if (id in merged) {
        merged[id] = point;
      }
    }
    setPositions(merged);
    fit(merged);
  }, [fit, initialPositions, size.width]);

  // Wheel zoom towards the cursor. Registered natively: React's wheel listener is passive.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = stage.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      setViewport((current) => {
        const k = Math.min(
          MAX_ZOOM,
          Math.max(MIN_ZOOM, current.k * Math.exp(-event.deltaY * 0.0015))
        );
        const ratio = k / current.k;
        return { k, x: px - (px - current.x) * ratio, y: py - (py - current.y) * ratio };
      });
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, []);

  const zoomBy = (factor: number) => {
    setViewport((current) => {
      const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.k * factor));
      const ratio = k / current.k;
      const cx = size.width / 2;
      const cy = size.height / 2;
      return { k, x: cx - (cx - current.x) * ratio, y: cy - (cy - current.y) * ratio };
    });
  };

  const onBackgroundPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      kind: "pan",
      origin: { x: event.clientX, y: event.clientY },
      start: viewport,
    };
    setPanning(true);
  };

  const onNodePointerDown = (event: ReactPointerEvent<SVGGElement>, id: string) => {
    if (event.button !== 0) {
      return;
    }
    event.stopPropagation();
    event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
    dragRef.current = {
      id,
      kind: "node",
      moved: false,
      origin: { x: event.clientX, y: event.clientY },
      start: positions[id] ?? { x: 0, y: 0 },
    };
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }
    const dx = event.clientX - drag.origin.x;
    const dy = event.clientY - drag.origin.y;
    if (drag.kind === "pan") {
      setViewport({ k: drag.start.k, x: drag.start.x + dx, y: drag.start.y + dy });
      return;
    }
    if (!drag.moved && Math.hypot(dx, dy) < 4) {
      return;
    }
    drag.moved = true;
    setPositions((current) => ({
      ...current,
      [drag.id]: { x: drag.start.x + dx / viewport.k, y: drag.start.y + dy / viewport.k },
    }));
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    setPanning(false);
    if (!drag) {
      return;
    }
    if (drag.kind === "node") {
      if (drag.moved) {
        storePositions(positions);
      } else {
        setSelected((current) => (current === drag.id ? null : drag.id));
      }
    } else if (Math.hypot(viewport.x - drag.start.x, viewport.y - drag.start.y) < 4) {
      setSelected(null);
    }
  };

  const resetLayout = () => {
    storePositions(null);
    setPositions(initialPositions);
    fit(initialPositions);
  };

  const copy = async (kind: "ai" | "mermaid") => {
    try {
      await navigator.clipboard.writeText(kind === "ai" ? toMarkdown(visible) : toMermaid(visible));
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  };

  const activateFinding = (id: string | null) => {
    setActiveFinding(id);
    setSelected(null);
  };

  const focus = hovered ?? selected;
  const needle = query.trim().toLowerCase();

  const highlighted = useMemo(() => {
    if (!focus && finding) {
      return new Set(finding.nodeIds);
    }
    if (!focus && !needle) {
      return null;
    }
    const ids = new Set<string>();
    if (focus) {
      ids.add(focus);
      for (const edge of visible.edges) {
        if (edge.source === focus) {
          ids.add(edge.target);
        }
        if (edge.target === focus) {
          ids.add(edge.source);
        }
      }
      return ids;
    }
    for (const node of visible.nodes) {
      if (node.label.toLowerCase().includes(needle) || node.slug.toLowerCase().includes(needle)) {
        ids.add(node.id);
      }
    }
    return ids;
  }, [finding, focus, needle, visible]);
  const findingEdges =
    !focus && finding && finding.edgeIds.length > 0 ? new Set(finding.edgeIds) : null;

  const selectedNode = visible.nodes.find((node) => node.id === selected);
  const collections = visible.nodes.filter((node) => node.kind === "collection").length;
  const globals = visible.nodes.length - collections;
  const hasGlobals = graph.nodes.some((node) => node.kind === "global");
  const hasUploads = graph.nodes.some((node) => node.upload);

  return (
    <div className="rg">
      <style href="payload-relations-graph" precedence="default">
        {GRAPH_CSS}
      </style>

      <div className="rg__header">
        <h1 className="rg__title">{title}</h1>
        <span className="rg__summary">
          {collections} collections{globals > 0 ? ` · ${globals} globals` : ""} ·{" "}
          {visible.edges.length} relations
        </span>
        <div className="rg__toolbar">
          <input
            aria-label="Find a collection"
            className="rg__search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a collection…"
            type="search"
            value={query}
          />
          {hasGlobals ? (
            <button
              aria-pressed={showGlobals}
              className="rg__btn"
              onClick={() => setShowGlobals((value) => !value)}
              type="button"
            >
              Globals
            </button>
          ) : null}
          {hasUploads ? (
            <button
              aria-pressed={showUploads}
              className="rg__btn"
              onClick={() => setShowUploads((value) => !value)}
              type="button"
            >
              Uploads
            </button>
          ) : null}
          <button className="rg__btn" onClick={resetLayout} type="button">
            Reset layout
          </button>
          {insights ? (
            <>
              <button
                aria-busy={statsState.status === "loading"}
                aria-pressed={dataOn}
                className="rg__btn"
                onClick={toggleData}
                title="Overlay live document counts and how often each relation is set"
                type="button"
              >
                {statsState.status === "loading" ? "Data…" : "Data"}
              </button>
              <button
                aria-pressed={insightsOpen}
                className="rg__btn"
                onClick={() => {
                  setInsightsOpen((value) => !value);
                  setSelected(null);
                }}
                type="button"
              >
                Insights
                {findings.length > 0 ? (
                  <span
                    className={`rg__count${findings.some((item) => item.severity === "warning") ? " rg__count--warning" : ""}`}
                  >
                    {findings.length}
                  </span>
                ) : null}
              </button>
            </>
          ) : null}
          <button className="rg__btn" onClick={() => copy("mermaid")} type="button">
            {copied === "mermaid" ? "Copied" : "Copy as Mermaid"}
          </button>
          <button
            className="rg__btn"
            onClick={() => copy("ai")}
            title="Copy a markdown brief of the content model for an AI assistant's prompt"
            type="button"
          >
            {copied === "ai" ? "Copied" : "Copy for AI"}
          </button>
        </div>
      </div>

      <div className="rg__body">
        <div className="rg__stage" ref={stageRef}>
          <svg
            aria-label="Graph of collections and the relations between them"
            className={`rg__svg${panning ? " rg__svg--panning" : ""}`}
            onPointerCancel={onPointerUp}
            onPointerDown={onBackgroundPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            role="img"
          >
            <defs>
              <pattern height="24" id="rg-grid" patternUnits="userSpaceOnUse" width="24">
                <circle className="rg__grid" cx="1" cy="1" r="1" />
              </pattern>
              {(["relationship", "upload", "join"] as const).map((type) => (
                <marker
                  id={`rg-arrow-${type}`}
                  key={type}
                  markerHeight="12"
                  markerUnits="userSpaceOnUse"
                  markerWidth="12"
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
            <rect fill="url(#rg-grid)" height="100%" width="100%" />

            <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.k})`}>
              {links.map((link) => {
                const source = positions[link.source];
                const target = positions[link.target];
                if (!source || !target) {
                  return null;
                }
                const shape = linkShape(source, target, link);
                const type = linkType(link);
                let dim = false;
                if (focus) {
                  dim = link.source !== focus && link.target !== focus;
                } else if (findingEdges) {
                  dim = !link.edges.some((edge) => findingEdges.has(edge.id));
                } else if (highlighted) {
                  dim = !(highlighted.has(link.source) && highlighted.has(link.target));
                }
                const rate = shownStats ? linkFillRate(link, shownStats) : null;
                const label =
                  rate === null || link.edges.length > 1
                    ? truncate(linkLabel(link), 26)
                    : `${truncate(linkLabel(link), 20)} · ${percentText(rate)}`;
                return (
                  <g className={dim ? "rg__dim" : undefined} key={link.id}>
                    <path
                      className={`rg__edge rg__edge--${type}${rate === 0 ? " rg__edge--unused" : ""}`}
                      d={shape.d}
                      markerEnd={`url(#rg-arrow-${type})`}
                      style={
                        rate === null
                          ? undefined
                          : { strokeOpacity: 0.35 + 0.65 * rate, strokeWidth: 1 + 2.25 * rate }
                      }
                    />
                    <text
                      className="rg__edge-label"
                      textAnchor="middle"
                      x={shape.label.x}
                      y={shape.label.y - 5}
                    >
                      {label}
                    </text>
                  </g>
                );
              })}

              {visible.nodes.map((node) => {
                const position = positions[node.id];
                if (!position) {
                  return null;
                }
                const classes = [
                  "rg__node",
                  `rg__node--${node.kind}`,
                  node.upload ? "rg__node--upload" : "",
                  node.id === selected ? "rg__node--selected" : "",
                  finding?.nodeIds.includes(node.id) ? `rg__node--flagged-${finding.severity}` : "",
                  highlighted && !highlighted.has(node.id) ? "rg__dim" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <g
                    className={classes}
                    key={node.id}
                    onPointerDown={(event) => onNodePointerDown(event, node.id)}
                    onPointerEnter={() => setHovered(node.id)}
                    onPointerLeave={() => setHovered(null)}
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
                      {nodeMeta(node, relationCounts.get(node.id) ?? 0, shownStats)}
                    </text>
                    {insightsOpen && warningNodes.has(node.id) ? (
                      <circle className="rg__node-warning" cx={NODE_WIDTH - 12} cy="12" r="4">
                        <title>Has a warning — see Insights</title>
                      </circle>
                    ) : null}
                  </g>
                );
              })}
            </g>
          </svg>

          {insights && dataOn && statsState.status !== "idle" ? (
            <div
              className={`rg__status${statsState.status === "error" ? " rg__status--error" : ""}`}
              role="status"
            >
              {statsState.status === "loading" ? "Loading live data…" : null}
              {statsState.status === "error" ? (
                <>
                  Live data could not be loaded: {statsState.message}
                  <button className="rg__link-btn" onClick={() => void loadStats()} type="button">
                    Retry
                  </button>
                </>
              ) : null}
              {statsState.status === "ready" && stats ? (
                <>
                  Live data · {new Date(stats.generatedAt).toLocaleTimeString()}
                  {stats.truncated ? ` · some numbers skipped (over ${stats.scanLimit} docs)` : ""}
                  <button className="rg__link-btn" onClick={() => void loadStats()} type="button">
                    Refresh
                  </button>
                </>
              ) : null}
            </div>
          ) : null}

          {visible.nodes.length === 0 ? (
            <div className="rg__empty">No collections to show.</div>
          ) : null}

          <div className="rg__legend">
            <span className="rg__legend-item">
              <span className="rg__legend-line" /> relationship
            </span>
            <span className="rg__legend-item">
              <span className="rg__legend-line rg__legend-line--upload" /> upload
            </span>
            <span className="rg__legend-item">
              <span className="rg__legend-line rg__legend-line--join" /> join (reverse)
            </span>
            <span className="rg__legend-item">[ ] has many</span>
            {shownStats ? (
              <span className="rg__legend-item">
                thicker line · % = share of documents with it set
              </span>
            ) : null}
          </div>

          <div className="rg__zoom">
            <button
              aria-label="Zoom out"
              className="rg__btn"
              onClick={() => zoomBy(1 / 1.25)}
              type="button"
            >
              −
            </button>
            <button
              aria-label="Zoom in"
              className="rg__btn"
              onClick={() => zoomBy(1.25)}
              type="button"
            >
              +
            </button>
            <button className="rg__btn" onClick={() => fit(positions)} type="button">
              Fit
            </button>
          </div>
        </div>

        {selectedNode ? (
          <NodePanel
            adminRoute={adminRoute}
            graph={visible}
            node={selectedNode}
            onBack={insightsOpen ? () => setSelected(null) : undefined}
            onSelect={setSelected}
            stats={shownStats}
          />
        ) : null}
        {!selectedNode && insights && insightsOpen ? (
          <InsightsPanel
            activeId={activeFinding}
            findings={findings}
            onActivate={activateFinding}
            onClose={() => setInsightsOpen(false)}
            onLoadData={() => void loadStats()}
            stats={stats ? { status: "ready" } : statsState}
          />
        ) : null}
      </div>
    </div>
  );
};

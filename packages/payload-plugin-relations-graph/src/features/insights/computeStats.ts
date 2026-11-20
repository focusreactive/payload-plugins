import { getAccessResults } from "payload";
import type { CollectionSlug, GlobalSlug, PayloadRequest, SelectType } from "payload";

import { buildSchemaGraph } from "../../graph/buildSchemaGraph.js";
import type { GraphEdge, GraphNode } from "../../graph/types.js";
import { getVisibleGraph } from "../../lib/getVisibleGraph.js";
import { fillWhere, relationIds, topLevelField } from "./fieldValues.js";
import type { RelationId } from "./fieldValues.js";
import type { EdgeStats, NodeStats, RelationsStats } from "./types.js";

export const DEFAULT_SCAN_LIMIT = 5000;
export const MAX_SCAN_LIMIT = 50_000;
const PAGE_SIZE = 500;
/** Ids per `id: { in }` query when counting which referenced documents still exist. */
const ID_CHUNK = 250;
/** Queries in flight at once — keeps a small connection pool (or SQLite) from choking. */
const CONCURRENCY = 6;

export const STATS_CAVEATS = [
  "References inside rich text (links, uploads, blocks in the editor) are not counted: “not referenced” means not referenced by any relation or upload field — never read it as “safe to delete”.",
  "Numbers only include documents and fields you are allowed to read.",
  "A relation counts as set when it holds at least one value in any locale; ids of deleted documents still count as set.",
];

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message.slice(0, 200) : "Query failed";

/** Runs async tasks with at most `limit` in flight; each task handles its own errors. */
const runLimited = async (tasks: (() => Promise<void>)[], limit: number): Promise<void> => {
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < tasks.length) {
      const task = tasks[next];
      next += 1;
      // oxlint-disable-next-line no-await-in-loop -- a deliberate, bounded worker queue
      await task?.();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
};

interface ScanResult {
  error?: string;
  truncated: boolean;
}

interface Measurement {
  /** Source documents in which each edge holds a value (main documents only, not drafts). */
  filled: Map<string, number>;
  /** Per target node: ids referenced from anywhere. */
  referenced: Map<string, Map<string, RelationId>>;
}

const slugOf = (nodeId: string): string => nodeId.replace(/^[a-z]+:/u, "");

const addReferences = (
  measurement: Measurement,
  doc: unknown,
  edges: GraphEdge[],
  locales: ReadonlySet<string>,
  countFill: boolean
): void => {
  for (const edge of edges) {
    const ids = relationIds(doc, edge, slugOf(edge.target), locales);
    if (countFill && ids.length > 0) {
      measurement.filled.set(edge.id, (measurement.filled.get(edge.id) ?? 0) + 1);
    }
    let set = measurement.referenced.get(edge.target);
    if (!set) {
      set = new Map();
      measurement.referenced.set(edge.target, set);
    }
    for (const id of ids) {
      set.set(String(id), id);
    }
  }
};

/**
 * Live data statistics for the graph this user may see: document counts, relation fill
 * rates and documents not referenced by any relation field. Every query runs with
 * `overrideAccess: false` and the request's user; a failing query only blanks its own numbers.
 */
export const computeStats = async (
  req: PayloadRequest,
  { scanLimit = DEFAULT_SCAN_LIMIT }: { scanLimit?: number } = {}
): Promise<RelationsStats> => {
  const { payload } = req;
  const permissions = await getAccessResults({ req });
  const visible = getVisibleGraph(req, permissions);
  const locales = new Set(
    payload.config.localization ? payload.config.localization.localeCodes : []
  );
  const localeArg = locales.size > 0 ? ("all" as const) : undefined;
  const canRead = (node: GraphNode): boolean =>
    node.kind === "collection"
      ? Boolean(permissions.collections?.[node.slug]?.read)
      : Boolean(permissions.globals?.[node.slug]?.read);
  const hasDrafts = (node: GraphNode): boolean =>
    node.kind === "collection"
      ? Boolean(payload.collections[node.slug as CollectionSlug]?.config.versions?.drafts)
      : Boolean(
          payload.config.globals.find((global) => global.slug === node.slug)?.versions?.drafts
        );

  // References are gathered from every readable entity — including hidden collections and ones
  // the graph leaves out — so a reference from outside the picture still counts as a reference.
  const everything = buildSchemaGraph(payload.config, {
    includeGlobals: true,
    includeHidden: true,
  });
  const allNodes = new Map(everything.nodes.map((node) => [node.id, node]));
  const visibleNodes = new Map(visible.nodes.map((node) => [node.id, node]));

  const nodes: Record<string, NodeStats> = {};
  const edges: Record<string, EdgeStats> = {};
  for (const node of visible.nodes) {
    nodes[node.id] = { total: node.kind === "global" ? 1 : null, unreferenced: null };
  }

  // Which targets get an "unreferenced" number: collections some relation field points to.
  const referenceEdges = new Map<string, GraphEdge[]>();
  const incompleteTargets = new Set<string>();
  for (const edge of everything.edges) {
    const source = allNodes.get(edge.source);
    const target = visibleNodes.get(edge.target);
    if (edge.type === "join" || !source || !target || target.auth) {
      continue;
    }
    // Payload's own bookkeeping (document locks, preferences, jobs) is not content usage.
    if (source.slug.startsWith("payload-")) {
      continue;
    }
    if (!canRead(source)) {
      incompleteTargets.add(edge.target);
      continue;
    }
    referenceEdges.set(edge.target, [...(referenceEdges.get(edge.target) ?? []), edge]);
  }
  const referenceEdgeIds = new Set([...referenceEdges.values()].flat().map((edge) => edge.id));

  // Plan: fill rates by `count` where reliable, otherwise by reading the source documents.
  const fillEdges = visible.edges.filter((edge) => edge.type !== "join");
  const countEdges: { edge: GraphEdge; where: NonNullable<ReturnType<typeof fillWhere>> }[] = [];
  const scanEdges = new Map<string, GraphEdge[]>();
  const fillByScan = new Set<string>();
  const addScanEdge = (edge: GraphEdge): void => {
    const list = scanEdges.get(edge.source) ?? [];
    if (!list.some((item) => item.id === edge.id)) {
      list.push(edge);
    }
    scanEdges.set(edge.source, list);
  };
  for (const edge of fillEdges) {
    const where =
      allNodes.get(edge.source)?.kind === "collection"
        ? fillWhere(edge, slugOf(edge.target))
        : null;
    if (where) {
      countEdges.push({ edge, where });
    } else {
      fillByScan.add(edge.id);
      addScanEdge(edge);
    }
  }
  for (const edge of [...referenceEdges.values()].flat()) {
    addScanEdge(edge);
  }

  const measurement: Measurement = { filled: new Map(), referenced: new Map() };
  const scans = new Map<string, ScanResult>();

  const scanCollection = async (
    node: GraphNode,
    list: GraphEdge[],
    draft: boolean
  ): Promise<ScanResult> => {
    const select = Object.fromEntries(
      list.map((edge) => [topLevelField(edge), true])
    ) as SelectType;
    const scanned = draft ? list.filter((edge) => referenceEdgeIds.has(edge.id)) : list;
    let page = 1;
    let seen = 0;
    for (;;) {
      // oxlint-disable-next-line no-await-in-loop -- pages are read one after another on purpose
      const result = await payload.find({
        collection: node.slug as CollectionSlug,
        depth: 0,
        draft,
        limit: PAGE_SIZE,
        locale: localeArg,
        overrideAccess: false,
        page,
        req,
        select,
        sort: "id",
      });
      for (const doc of result.docs) {
        addReferences(measurement, doc, scanned, locales, !draft);
      }
      seen += result.docs.length;
      if (!result.hasNextPage) {
        return { truncated: false };
      }
      if (seen >= scanLimit) {
        return { truncated: true };
      }
      page += 1;
    }
  };

  const tasks: (() => Promise<void>)[] = [];

  for (const node of visible.nodes) {
    if (node.kind !== "collection") {
      continue;
    }
    tasks.push(async () => {
      try {
        const { totalDocs } = await payload.count({
          collection: node.slug as CollectionSlug,
          overrideAccess: false,
          req,
        });
        nodes[node.id] = { ...nodes[node.id], total: totalDocs, unreferenced: null };
      } catch (error) {
        nodes[node.id] = { total: null, unreferenced: null, unreferencedNote: errorText(error) };
      }
    });
  }

  for (const { edge, where } of countEdges) {
    tasks.push(async () => {
      try {
        const { totalDocs } = await payload.count({
          collection: slugOf(edge.source) as CollectionSlug,
          overrideAccess: false,
          req,
          where,
        });
        edges[edge.id] = { filled: totalDocs, method: "count", total: null };
      } catch (error) {
        edges[edge.id] = { filled: null, method: null, note: errorText(error), total: null };
      }
    });
  }

  for (const [sourceId, list] of scanEdges) {
    const node = allNodes.get(sourceId);
    if (!node) {
      continue;
    }
    const modes =
      hasDrafts(node) && list.some((edge) => referenceEdgeIds.has(edge.id))
        ? [false, true]
        : [false];
    for (const draft of modes) {
      tasks.push(async () => {
        const key = `${sourceId}:${draft ? "draft" : "main"}`;
        try {
          if (node.kind === "global") {
            const doc = await payload.findGlobal({
              depth: 0,
              draft,
              locale: localeArg,
              overrideAccess: false,
              req,
              slug: node.slug as GlobalSlug,
            });
            addReferences(
              measurement,
              doc,
              draft ? list.filter((edge) => referenceEdgeIds.has(edge.id)) : list,
              locales,
              !draft
            );
            scans.set(key, { truncated: false });
          } else {
            scans.set(key, await scanCollection(node, list, draft));
          }
        } catch (error) {
          scans.set(key, { error: errorText(error), truncated: false });
        }
      });
    }
  }

  await runLimited(tasks, CONCURRENCY);

  const scanProblem = (sourceId: string, includeDrafts: boolean): string | null => {
    for (const mode of includeDrafts ? ["main", "draft"] : ["main"]) {
      const scan = scans.get(`${sourceId}:${mode}`);
      if (!scan) {
        continue;
      }
      if (scan.error) {
        return scan.error;
      }
      if (scan.truncated) {
        return `More than ${scanLimit} documents in ${slugOf(sourceId)}; not measured.`;
      }
    }
    return null;
  };

  // Fill rates measured by reading documents.
  for (const edge of fillEdges) {
    const source = visibleNodes.get(edge.source);
    const total = source?.kind === "global" ? 1 : (nodes[edge.source]?.total ?? null);
    if (!fillByScan.has(edge.id)) {
      edges[edge.id] = { ...(edges[edge.id] ?? { filled: null, method: null }), total };
      continue;
    }
    const problem = scanProblem(edge.source, false);
    edges[edge.id] = problem
      ? { filled: null, method: null, note: problem, total }
      : {
          filled: measurement.filled.get(edge.id) ?? 0,
          method: source?.kind === "global" ? "global" : "scan",
          total,
        };
  }

  // Unreferenced documents: total minus the referenced ids that still exist (and are readable).
  const unreferencedTasks: (() => Promise<void>)[] = [];
  for (const node of visible.nodes) {
    const stats = nodes[node.id];
    if (node.kind !== "collection" || !stats) {
      continue;
    }
    const incoming = referenceEdges.get(node.id) ?? [];
    if (node.auth) {
      stats.unreferencedNote = "Not computed for auth collections.";
      continue;
    }
    if (incoming.length === 0) {
      stats.unreferencedNote = "No relation field you can read points to this collection.";
      continue;
    }
    const problems = [
      ...new Set(incoming.map((edge) => scanProblem(edge.source, true)).filter(Boolean)),
    ];
    if (problems.length > 0 || stats.total === null) {
      stats.unreferencedNote = problems.join(" ") || "Document count failed.";
      continue;
    }
    const total = stats.total;
    const ids = [...(measurement.referenced.get(node.id)?.values() ?? [])];
    unreferencedTasks.push(async () => {
      try {
        let existing = 0;
        for (let index = 0; index < ids.length; index += ID_CHUNK) {
          // oxlint-disable-next-line no-await-in-loop -- chunks are summed sequentially to bound load
          const { totalDocs } = await payload.count({
            collection: node.slug as CollectionSlug,
            overrideAccess: false,
            req,
            where: { id: { in: ids.slice(index, index + ID_CHUNK) } },
          });
          existing += totalDocs;
        }
        stats.unreferenced = Math.max(0, total - existing);
        if (incompleteTargets.has(node.id)) {
          stats.unreferencedIncomplete = true;
          stats.unreferencedNote =
            "Some collections that can point here are not readable for you; their references are not counted.";
        }
      } catch (error) {
        stats.unreferencedNote = errorText(error);
      }
    });
  }
  await runLimited(unreferencedTasks, CONCURRENCY);

  return {
    caveats: STATS_CAVEATS,
    edges,
    generatedAt: new Date().toISOString(),
    nodes,
    scanLimit,
    truncated: [...scans.values()].some((scan) => scan.truncated),
  };
};

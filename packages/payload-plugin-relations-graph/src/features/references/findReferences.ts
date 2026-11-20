import type { Payload, PayloadRequest, SanitizedCollectionConfig, Where } from "payload";

import { buildSchemaGraph } from "../../graph/buildSchemaGraph.js";
import type { GraphEdge, GraphNode, SchemaGraph } from "../../graph/types.js";
import { getOptions } from "../../lib/options.js";
import {
  docReferences,
  mergeVariants,
  pickTitle,
  planReferenceLookups,
  rootFieldName,
} from "./query.js";
import type { QueryLookup, ScanLookup, VariantResult } from "./query.js";
import type {
  FindReferencesArgs,
  ReferenceGroup,
  ReferencesResult,
  ReferencingDoc,
} from "./types.js";

export const DEFAULT_LIMIT = 10;
export const DEFAULT_SCAN_LIMIT = 1000;
const SCAN_PAGE_SIZE = 100;

interface Context {
  id: number | string;
  includeDrafts: boolean;
  limit: number;
  localeCodes: string[];
  overrideAccess: boolean;
  payload: Payload;
  /** Locales to prefer for titles: the request's, then the default. */
  preferredLocales: string[];
  req?: PayloadRequest;
  scanLimit: number;
  target: string;
}

const isForbidden = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  ((error as { status?: unknown }).status === 403 ||
    (error as { name?: unknown }).name === "Forbidden");

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const toGroup = (
  edge: GraphEdge,
  source: GraphNode,
  result: Partial<ReferenceGroup> = {}
): ReferenceGroup => ({
  docs: [],
  field: {
    blocks: edge.blocks,
    hasMany: edge.hasMany,
    localized: edge.localized,
    path: edge.path,
    polymorphic: edge.polymorphic,
    type: edge.type === "upload" ? "upload" : "relationship",
  },
  source: { kind: source.kind, label: source.label, slug: source.slug },
  totalDocs: 0,
  ...result,
});

const collectionConfig = (payload: Payload, slug: string): SanitizedCollectionConfig | undefined =>
  payload.collections[slug]?.config;

/** The field a document is listed by: `admin.useAsTitle`, or the filename for uploads. */
const titleFieldOf = (config: SanitizedCollectionConfig | undefined): string => {
  const useAsTitle = config?.admin?.useAsTitle;
  if (useAsTitle && useAsTitle !== "id") {
    return useAsTitle;
  }
  return config?.upload ? "filename" : "id";
};

const hasDrafts = (versions: unknown): boolean =>
  typeof versions === "object" &&
  versions !== null &&
  Boolean((versions as { drafts?: unknown }).drafts);

const draftStates = (context: Context, versions: unknown): boolean[] =>
  context.includeDrafts && hasDrafts(versions) ? [false, true] : [false];

const docTitle = (doc: Record<string, unknown>, titleField: string, context: Context): string =>
  pickTitle(doc[titleField], String(doc.id), context.preferredLocales);

const runQuery = async (lookup: QueryLookup, context: Context): Promise<ReferenceGroup> => {
  const { edge, source, where } = lookup;
  const { payload } = context;
  const config = collectionConfig(payload, source.slug);
  const titleField = titleFieldOf(config);
  // Localized fields are queried once per locale: `locale: "all"` in a `where` is not supported
  // by every adapter, a per-locale query is.
  const locales: (string | undefined)[] =
    edge.localized && context.localeCodes.length > 0 ? context.localeCodes : [undefined];

  const variants = await Promise.all(
    draftStates(context, config?.versions).flatMap((draft) =>
      locales.map(async (locale): Promise<VariantResult> => {
        const found = await payload.find({
          collection: source.slug,
          depth: 0,
          draft,
          limit: context.limit,
          ...(locale ? { locale } : {}),
          overrideAccess: context.overrideAccess,
          req: context.req,
          select: { [titleField]: true },
          where: where as Where,
        });
        return {
          docs: found.docs.map((doc) => {
            const record = doc as Record<string, unknown>;
            return {
              id: record.id as number | string,
              title: docTitle(record, titleField, context),
            };
          }),
          draft,
          totalDocs: found.totalDocs,
        };
      })
    )
  );

  const merged = mergeVariants(variants, context.limit);
  return toGroup(edge, source, {
    docs: merged.docs,
    totalDocs: merged.totalDocs,
    ...(merged.approximate ? { approximate: true } : {}),
  });
};

interface Match {
  drafts: Set<boolean>;
  id: number | string;
  title: string;
}

/** Load the source's documents page by page and look for the target in every edge's value. */
const runCollectionScan = async (
  lookup: ScanLookup,
  context: Context
): Promise<ReferenceGroup[]> => {
  const { edges, source } = lookup;
  const { payload } = context;
  const config = collectionConfig(payload, source.slug);
  const titleField = titleFieldOf(config);
  const localeCodes = new Set(context.localeCodes);
  const select: Record<string, true> = { [titleField]: true };
  for (const edge of edges) {
    select[rootFieldName(edge.path)] = true;
  }

  const matches = new Map<string, Map<string, Match>>(edges.map((edge) => [edge.id, new Map()]));
  let partial = false;
  const states = draftStates(context, config?.versions);

  for (const draft of states) {
    let page = 1;
    let scanned = 0;
    for (;;) {
      // Pages depend on each other's `hasNextPage`, so they run one after another.
      // oxlint-disable-next-line no-await-in-loop
      const found = await payload.find({
        collection: source.slug,
        depth: 0,
        draft,
        limit: SCAN_PAGE_SIZE,
        locale: "all",
        overrideAccess: context.overrideAccess,
        page,
        req: context.req,
        select,
        sort: "id",
      });
      for (const doc of found.docs) {
        const record = doc as Record<string, unknown>;
        for (const edge of edges) {
          if (docReferences(record, edge, context.target, context.id, localeCodes)) {
            const byDoc = matches.get(edge.id) as Map<string, Match>;
            const key = String(record.id);
            const match = byDoc.get(key) ?? {
              drafts: new Set<boolean>(),
              id: record.id as number | string,
              title: docTitle(record, titleField, context),
            };
            match.drafts.add(draft);
            byDoc.set(key, match);
          }
        }
      }
      scanned += found.docs.length;
      if (!found.hasNextPage) {
        break;
      }
      if (scanned >= context.scanLimit) {
        partial = true;
        break;
      }
      page += 1;
    }
  }

  const checksPublished = states.includes(false);
  return edges.map((edge) => {
    const byDoc = matches.get(edge.id) as Map<string, Match>;
    const all: ReferencingDoc[] = [...byDoc.values()].map(({ drafts, id, title }) => {
      const draftOnly = checksPublished && !drafts.has(false);
      return draftOnly ? { draftOnly, id, title } : { id, title };
    });
    return toGroup(edge, source, {
      docs: all.slice(0, context.limit),
      totalDocs: all.length,
      ...(partial ? { partial: true } : {}),
    });
  });
};

/** Globals cannot be queried: load the global (published and latest draft) and read the values. */
const runGlobalScan = async (lookup: ScanLookup, context: Context): Promise<ReferenceGroup[]> => {
  const { edges, source } = lookup;
  const { payload } = context;
  const config = payload.config.globals.find((global) => global.slug === source.slug);
  const localeCodes = new Set(context.localeCodes);
  const states = draftStates(context, config?.versions);

  const docs = await Promise.all(
    states.map((draft) =>
      payload.findGlobal({
        depth: 0,
        draft,
        locale: "all",
        overrideAccess: context.overrideAccess,
        req: context.req,
        slug: source.slug,
      })
    )
  );

  return edges.map((edge) => {
    const found = states.filter((_draft, index) =>
      docReferences(docs[index], edge, context.target, context.id, localeCodes)
    );
    if (found.length === 0) {
      return toGroup(edge, source);
    }
    const draftOnly = states.includes(false) && !found.includes(false);
    const doc: ReferencingDoc = { id: source.slug, title: source.label };
    return toGroup(edge, source, { docs: [draftOnly ? { ...doc, draftOnly } : doc], totalDocs: 1 });
  });
};

/** Run a lookup; a forbidden source is left out, any other failure is reported on its fields. */
const settle = async (
  edges: GraphEdge[],
  source: GraphNode,
  run: () => Promise<ReferenceGroup | ReferenceGroup[]>
): Promise<ReferenceGroup[]> => {
  try {
    const result = await run();
    return Array.isArray(result) ? result : [result];
  } catch (error) {
    if (isForbidden(error)) {
      return [];
    }
    return edges.map((edge) => toGroup(edge, source, { error: errorMessage(error) }));
  }
};

const graphCache = new WeakMap<object, Map<string, SchemaGraph>>();

const getGraph = (payload: Payload, options: FindReferencesArgs["graph"]): SchemaGraph => {
  const resolved = options ?? getOptions(payload.config);
  const key = JSON.stringify({
    exclude: resolved.exclude ?? [],
    includeGlobals: resolved.includeGlobals ?? true,
    includeHidden: resolved.includeHidden ?? false,
  });
  const cache = graphCache.get(payload.config) ?? new Map<string, SchemaGraph>();
  graphCache.set(payload.config, cache);
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }
  const graph = buildSchemaGraph(payload.config, resolved);
  cache.set(key, graph);
  return graph;
};

/**
 * Find every document (and global) that references `collection`/`id` through a relationship or
 * upload field — however deep the field is nested, polymorphic or not, in any locale, published
 * or in the latest draft. Lookups run in parallel; a failing one is reported on its field
 * (`error`) instead of failing the whole result. References inside rich text are not covered.
 *
 * Usable from hooks, e.g. to refuse deleting a document that is still referenced:
 * `const { total } = await findReferences({ req, collection: "media", id })`.
 */
export const findReferences = async (args: FindReferencesArgs): Promise<ReferencesResult> => {
  const payload = args.payload ?? args.req?.payload;
  if (!payload) {
    throw new Error("findReferences: pass `payload` or `req`");
  }
  const localization = payload.config.localization;
  const localeCodes = localization ? localization.localeCodes : [];
  const preferred = [
    args.req?.locale,
    localization ? localization.defaultLocale : undefined,
  ].filter((locale): locale is string => typeof locale === "string" && locale !== "all");

  const context: Context = {
    id: args.id,
    includeDrafts: args.includeDrafts ?? true,
    limit: Math.max(1, Math.floor(args.limit ?? DEFAULT_LIMIT)),
    localeCodes: [
      ...new Set([...preferred.filter((code) => localeCodes.includes(code)), ...localeCodes]),
    ],
    overrideAccess: args.overrideAccess ?? true,
    payload,
    preferredLocales: preferred,
    req: args.req,
    scanLimit: Math.max(1, Math.floor(args.scanLimit ?? DEFAULT_SCAN_LIMIT)),
    target: args.collection,
  };

  const plan = planReferenceLookups(getGraph(payload, args.graph), args.collection, args.id);
  const settled = await Promise.all([
    ...plan.queries.map((lookup) =>
      settle([lookup.edge], lookup.source, () => runQuery(lookup, context))
    ),
    ...plan.scans.map((lookup) =>
      settle(lookup.edges, lookup.source, () =>
        lookup.source.kind === "global"
          ? runGlobalScan(lookup, context)
          : runCollectionScan(lookup, context)
      )
    ),
  ]);

  const groups = settled
    .flat()
    .filter((group) => group.totalDocs > 0 || group.error !== undefined)
    .toSorted(
      (a, b) =>
        a.source.label.localeCompare(b.source.label) || a.field.path.localeCompare(b.field.path)
    );

  return {
    collection: args.collection,
    groups,
    id: args.id,
    total: groups.reduce((sum, group) => sum + group.totalDocs, 0),
  };
};

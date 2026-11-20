import type { Block, Field } from "payload";

import type { BuildSchemaGraphOptions, GraphEdge, GraphNode, SchemaGraph } from "./types.js";

/** The slice of a (raw or sanitized) Payload config the graph is built from. */
export interface GraphSourceConfig {
  blocks?: Block[];
  collections?: GraphSourceEntity[];
  globals?: GraphSourceEntity[];
}

export interface GraphSourceEntity {
  admin?: { group?: unknown; hidden?: unknown };
  auth?: unknown;
  fields: Field[];
  label?: unknown;
  labels?: { plural?: unknown; singular?: unknown };
  slug: string;
  upload?: unknown;
  versions?: unknown;
}

export const collectionNodeId = (slug: string): string => `collection:${slug}`;
export const globalNodeId = (slug: string): string => `global:${slug}`;

const humanize = (slug: string): string =>
  slug
    .replace(/[-_]+/gu, " ")
    .replace(/([a-z\d])([A-Z])/gu, "$1 $2")
    .replace(/^./u, (char) => char.toUpperCase());

/** Payload labels may be a string, a per-locale record, or a function needing `t`. */
const resolveLabel = (label: unknown, fallback: string): string => {
  if (typeof label === "string" && label.length > 0) {
    return label;
  }
  if (label && typeof label === "object") {
    const record = label as Record<string, unknown>;
    const candidate = record.en ?? Object.values(record)[0];
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }
  return fallback;
};

interface WalkContext {
  blocks: string[];
  displayPath: string;
  localized: boolean;
  queryPath: string;
}

interface FoundRelation {
  blocks: string[];
  hasMany: boolean;
  localized: boolean;
  on?: string;
  path: string;
  polymorphic: boolean;
  queryPath: string;
  required: boolean;
  targets: string[];
  type: GraphEdge["type"];
}

interface WalkResult {
  fieldCount: number;
  relations: FoundRelation[];
}

const joinPath = (parent: string, name: string): string => (parent ? `${parent}.${name}` : name);

const walkFields = (
  fields: Field[],
  context: WalkContext,
  blocksBySlug: Map<string, Block>,
  result: WalkResult
): void => {
  for (const field of fields) {
    const named = "name" in field && typeof field.name === "string" ? field.name : undefined;
    const localized = context.localized || ("localized" in field && field.localized === true);
    const child: WalkContext = named
      ? {
          blocks: context.blocks,
          displayPath: joinPath(context.displayPath, named),
          localized,
          queryPath: joinPath(context.queryPath, named),
        }
      : context;

    if (named) {
      result.fieldCount += 1;
    }

    switch (field.type) {
      case "relationship":
      case "upload": {
        const targets = Array.isArray(field.relationTo) ? field.relationTo : [field.relationTo];
        result.relations.push({
          blocks: context.blocks,
          hasMany: field.hasMany === true,
          localized,
          path: child.displayPath,
          polymorphic: Array.isArray(field.relationTo),
          queryPath: child.queryPath,
          required: field.required === true,
          targets,
          type: field.type,
        });
        break;
      }
      case "join": {
        const targets = Array.isArray(field.collection) ? field.collection : [field.collection];
        result.relations.push({
          blocks: context.blocks,
          hasMany: true,
          localized,
          on: field.on,
          path: child.displayPath,
          polymorphic: Array.isArray(field.collection),
          queryPath: child.queryPath,
          required: false,
          targets,
          type: "join",
        });
        break;
      }
      case "group":
      case "array":
      case "row":
      case "collapsible": {
        walkFields(field.fields, child, blocksBySlug, result);
        break;
      }
      case "tabs": {
        for (const tab of field.tabs) {
          const tabName = "name" in tab && typeof tab.name === "string" ? tab.name : undefined;
          const tabContext: WalkContext = tabName
            ? {
                blocks: context.blocks,
                displayPath: joinPath(context.displayPath, tabName),
                localized: context.localized || tab.localized === true,
                queryPath: joinPath(context.queryPath, tabName),
              }
            : context;
          walkFields(tab.fields, tabContext, blocksBySlug, result);
        }
        break;
      }
      case "blocks": {
        const references = "blockReferences" in field ? (field.blockReferences ?? []) : [];
        const blocks: Block[] = [...field.blocks];
        for (const reference of references) {
          const block = typeof reference === "string" ? blocksBySlug.get(reference) : reference;
          if (block) {
            blocks.push(block);
          }
        }
        for (const block of blocks) {
          // A block nested inside itself would recurse forever.
          if (context.blocks.includes(block.slug)) {
            continue;
          }
          walkFields(
            block.fields,
            {
              blocks: [...context.blocks, block.slug],
              displayPath: `${child.displayPath}[${block.slug}]`,
              localized,
              queryPath: child.queryPath,
            },
            blocksBySlug,
            result
          );
        }
        break;
      }
      default: {
        break;
      }
    }
  }
};

const toNode = (
  entity: GraphSourceEntity,
  kind: GraphNode["kind"],
  fieldCount: number
): GraphNode => {
  const fallback = humanize(entity.slug);
  const group = entity.admin?.group;
  return {
    auth: Boolean(entity.auth),
    fieldCount,
    group: typeof group === "string" ? group : undefined,
    hidden: entity.admin?.hidden === true,
    id: kind === "collection" ? collectionNodeId(entity.slug) : globalNodeId(entity.slug),
    kind,
    label:
      kind === "collection"
        ? resolveLabel(entity.labels?.plural, fallback)
        : resolveLabel(entity.label, fallback),
    slug: entity.slug,
    upload: Boolean(entity.upload),
    versions: Boolean(entity.versions),
  };
};

/**
 * Turn a Payload config into a graph: one node per collection/global, one edge per
 * relationship, upload or join field — however deep it sits in groups, arrays, tabs or blocks.
 * Pure and synchronous; works on both the raw and the sanitized config.
 */
export const buildSchemaGraph = (
  config: GraphSourceConfig,
  options: BuildSchemaGraphOptions = {}
): SchemaGraph => {
  const { exclude = [], includeGlobals = true, includeHidden = false } = options;
  const excluded = new Set(exclude);
  const blocksBySlug = new Map((config.blocks ?? []).map((block) => [block.slug, block]));

  const entities: { entity: GraphSourceEntity; kind: GraphNode["kind"] }[] = [];
  for (const entity of config.collections ?? []) {
    if (excluded.has(entity.slug) || (!includeHidden && entity.admin?.hidden === true)) {
      continue;
    }
    entities.push({ entity, kind: "collection" });
  }
  if (includeGlobals) {
    for (const entity of config.globals ?? []) {
      if (excluded.has(entity.slug) || (!includeHidden && entity.admin?.hidden === true)) {
        continue;
      }
      entities.push({ entity, kind: "global" });
    }
  }

  const collectionSlugs = new Set(
    entities.filter(({ kind }) => kind === "collection").map(({ entity }) => entity.slug)
  );

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (const { entity, kind } of entities) {
    const result: WalkResult = { fieldCount: 0, relations: [] };
    walkFields(
      entity.fields,
      { blocks: [], displayPath: "", localized: false, queryPath: "" },
      blocksBySlug,
      result
    );

    const node = toNode(entity, kind, result.fieldCount);
    nodes.push(node);

    for (const relation of result.relations) {
      for (const target of relation.targets) {
        if (!collectionSlugs.has(target)) {
          continue;
        }
        edges.push({
          blocks: relation.blocks,
          hasMany: relation.hasMany,
          id: `${node.id}>${relation.path}>${target}`,
          localized: relation.localized,
          on: relation.on,
          path: relation.path,
          polymorphic: relation.polymorphic,
          queryPath: relation.queryPath,
          required: relation.required,
          source: node.id,
          target: collectionNodeId(target),
          type: relation.type,
        });
      }
    }
  }

  return { edges, nodes };
};

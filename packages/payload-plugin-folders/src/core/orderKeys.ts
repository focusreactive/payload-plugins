import { generateKeyBetween, generateNKeysBetween } from "payload/shared";
import type { PayloadRequest, Where } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { FolderId, ItemRef, ResolvedOptions } from "../types.js";
import { writeOrderKey } from "./structureWrite.js";

/** Keys longer than this are rebalanced away; a fresh sibling list needs two or three characters. */
export const maxOrderKeyLength = 32;

const orderKeyCharacters = /^[0-9a-z]+$/u;

/**
 * Payload's generator throws on a key it did not produce (a fraction ending in zero, an unknown
 * head character), so a usable key is one it accepts. Digits and lowercase letters only keeps the
 * order the same under case-insensitive database collations.
 */
export const isUsableOrderKey = (key: unknown): key is string => {
  if (typeof key !== "string" || key.length === 0 || key.length > maxOrderKeyLength) {
    return false;
  }
  if (!orderKeyCharacters.test(key)) {
    return false;
  }
  try {
    generateKeyBetween(key, null);
    return true;
  } catch {
    return false;
  }
};

export type SiblingRow = {
  collection: string;
  /** ISO timestamp, the tie break between unkeyed rows. */
  createdAt: string | null;
  id: number | string;
  kind: "folder" | "page";
  orderKey: string | null;
};

const hasKey = (row: SiblingRow): row is SiblingRow & { orderKey: string } =>
  typeof row.orderKey === "string" && row.orderKey !== "";

const compareStrings = (left: string, right: string): number => {
  if (left === right) {
    return 0;
  }

  // Code unit order, never locale order: the keys are built for it.
  return left < right ? -1 : 1;
};

const compareIds = (left: number | string, right: number | string): number =>
  typeof left === "number" && typeof right === "number"
    ? left - right
    : compareStrings(String(left), String(right));

/**
 * Spec section 6: by key, ties by kind (folder first), collection slug, then id. Rows without a
 * key come last, oldest first.
 */
export const compareSiblings = (left: SiblingRow, right: SiblingRow): number => {
  const leftHasKey = hasKey(left);
  const rightHasKey = hasKey(right);
  if (leftHasKey !== rightHasKey) {
    return leftHasKey ? -1 : 1;
  }
  if (leftHasKey && rightHasKey) {
    const byKey = compareStrings(left.orderKey, right.orderKey);
    if (byKey !== 0) {
      return byKey;
    }
  } else {
    const byCreation = compareStrings(left.createdAt ?? "", right.createdAt ?? "");
    if (byCreation !== 0) {
      return byCreation;
    }
  }
  if (left.kind !== right.kind) {
    return left.kind === "folder" ? -1 : 1;
  }
  const byCollection = compareStrings(left.collection, right.collection);

  return byCollection === 0 ? compareIds(left.id, right.id) : byCollection;
};

export type KeyRewrite = { orderKey: string; row: SiblingRow };

export type InsertPlan = {
  /** One key per inserted item, ascending, to be written by the caller. */
  keys: string[];
  /** Siblings whose key changes because the neighbours could not take an insert. */
  rewrites: KeyRewrite[];
};

const generateBetween = (
  left: SiblingRow | undefined,
  right: SiblingRow | undefined,
  count: number
): string[] | null => {
  if ((left && !isUsableOrderKey(left.orderKey)) || (right && !isUsableOrderKey(right.orderKey))) {
    return null;
  }
  const leftKey = left?.orderKey ?? null;
  const rightKey = right?.orderKey ?? null;
  if (leftKey !== null && rightKey !== null && leftKey >= rightKey) {
    return null;
  }

  try {
    const keys = generateNKeysBetween(leftKey, rightKey, count);

    return keys.every((key) => isUsableOrderKey(key)) ? keys : null;
  } catch {
    return null;
  }
};

/**
 * Keys for `count` new items in the gap after the first `gap` of the sorted `siblings`. Payload's
 * generator throws when the neighbours are equal or out of order, so such neighbours, a neighbour
 * without a key, a neighbour or a generated key over 32 characters rebalance the whole sibling
 * list first (spec section 6): `rewrites` lists the siblings that get new keys, and the insert
 * keys are generated between the new neighbour keys.
 */
export const planInsertKeys = ({
  count,
  gap,
  siblings,
}: {
  count: number;
  gap: number;
  siblings: SiblingRow[];
}): InsertPlan => {
  const direct = generateBetween(siblings[gap - 1], siblings[gap], count);
  if (direct) {
    return { keys: direct, rewrites: [] };
  }

  const rebalancedKeys = generateNKeysBetween(null, null, siblings.length);
  const rewrites = siblings
    .map((row, index): KeyRewrite => ({ orderKey: rebalancedKeys[index], row }))
    .filter(({ orderKey, row }) => row.orderKey !== orderKey);

  return {
    keys: generateNKeysBetween(rebalancedKeys[gap - 1] ?? null, rebalancedKeys[gap] ?? null, count),
    rewrites,
  };
};

type ParentFieldName = "folder" | "parent";

const parentWhere = (field: ParentFieldName, parent: FolderId | null): Where => ({
  [field]: { equals: parent },
});

type SiblingSource = { collection: string; field: ParentFieldName; kind: SiblingRow["kind"] };

const siblingSources = (options: ResolvedOptions): SiblingSource[] => [
  { collection: options.folders.slug, field: "parent", kind: "folder" },
  ...Object.keys(options.collections).map(
    (collection): SiblingSource => ({ collection, field: "folder", kind: "page" })
  ),
];

/** Every child of `parent` (folders and pages of every opted-in type), unsorted. */
export const loadSiblings = async (
  req: PayloadRequest,
  options: ResolvedOptions,
  parent: FolderId | null
): Promise<SiblingRow[]> => {
  const siblings: SiblingRow[] = [];

  // One query at a time: a transaction has one connection, and node-postgres deprecates queuing.
  for (const { collection, field, kind } of siblingSources(options)) {
    const { docs } = await req.payload.db.find({
      collection: toCollectionSlug(collection),
      limit: 0,
      pagination: false,
      req,
      select: { createdAt: true, orderKey: true },
      where: parentWhere(field, parent),
    });
    for (const doc of docs as Array<Record<string, unknown>>) {
      siblings.push({
        collection,
        createdAt: typeof doc.createdAt === "string" ? doc.createdAt : null,
        id: doc.id as number | string,
        kind,
        orderKey: typeof doc.orderKey === "string" ? doc.orderKey : null,
      });
    }
  }

  return siblings;
};

/** The smallest key among the children of `parent`, from one indexed query per collection. */
const findSmallestKey = async (
  req: PayloadRequest,
  options: ResolvedOptions,
  parent: FolderId | null
): Promise<SiblingRow | null> => {
  const candidates: SiblingRow[] = [];

  for (const { collection, field, kind } of siblingSources(options)) {
    const { docs } = await req.payload.db.find({
      collection: toCollectionSlug(collection),
      limit: 1,
      pagination: false,
      req,
      select: { orderKey: true },
      sort: "orderKey",
      where: { and: [parentWhere(field, parent), { orderKey: { exists: true } }] },
    });
    const [doc] = docs as Array<Record<string, unknown>>;
    if (doc) {
      candidates.push({
        collection,
        createdAt: null,
        id: doc.id as number | string,
        kind,
        orderKey: typeof doc.orderKey === "string" ? doc.orderKey : null,
      });
    }
  }

  return candidates.filter((candidate) => hasKey(candidate)).sort(compareSiblings)[0] ?? null;
};

export type InsertTarget = {
  /** Where the keys go: the very start or end of the folder, or directly after a sibling. */
  at: "end" | "start" | { after: ItemRef };
  count: number;
  /** Items about to leave the gap's siblings, such as the rows of the move being planned. */
  exclude?: ItemRef[];
  parent: FolderId | null;
};

const refKey = (ref: ItemRef): string => `${ref.collection}:${ref.id}`;

/**
 * Keys for `count` items inserted into `parent`, without writing anything: the keys, and the
 * siblings that would be rebalanced first when their keys cannot take the insert. Call it under
 * the tree lock: the sibling list is read once and the keys are only valid while no other writer
 * changes it. The move preview calls it unlocked for an indicative answer.
 */
export const planKeysForInsert = async (
  req: PayloadRequest,
  options: ResolvedOptions,
  { at, count, exclude = [], parent }: InsertTarget
): Promise<InsertPlan> => {
  if (count === 0) {
    return { keys: [], rewrites: [] };
  }

  // The common create puts one item on top: one query per collection beats loading every sibling.
  if (at === "start" && exclude.length === 0) {
    const smallest = await findSmallestKey(req, options, parent);
    const keys = generateBetween(undefined, smallest ?? undefined, count);
    if (keys) {
      return { keys, rewrites: [] };
    }
  }

  const excluded = new Set(exclude.map(refKey));
  const siblings = (await loadSiblings(req, options, parent))
    .filter((sibling) => !excluded.has(refKey(sibling)))
    .sort(compareSiblings);

  let gap = siblings.length;
  if (at === "start") {
    gap = 0;
  } else if (at !== "end") {
    const afterIndex = siblings.findIndex((sibling) => refKey(sibling) === refKey(at.after));
    if (afterIndex === -1) {
      throw new Error(`${refKey(at.after)} is not a child of folder ${parent ?? "(root)"}`);
    }
    gap = afterIndex + 1;
  }

  return planInsertKeys({ count, gap, siblings });
};

/** Writes the rebalanced siblings of an insert plan, main row and latest version. */
export const writeKeyRewrites = async (
  req: PayloadRequest,
  options: ResolvedOptions,
  rewrites: KeyRewrite[]
): Promise<void> => {
  for (const { orderKey, row } of rewrites) {
    await writeOrderKey(req, options, row, orderKey);
  }
};

/**
 * Keys for `count` items inserted into `parent`, rebalancing the siblings first when their keys
 * cannot take the insert. Rebalanced siblings are written here, main row and latest version,
 * inside the caller's transaction.
 */
export const keysForInsert = async (
  req: PayloadRequest,
  options: ResolvedOptions,
  target: InsertTarget
): Promise<string[]> => {
  const plan = await planKeysForInsert(req, options, target);
  await writeKeyRewrites(req, options, plan.rewrites);

  return plan.keys;
};

/** The key a new item gets: the top of its folder, or the bottom with `newItemPosition: 'bottom'`. */
export const keyForNewItem = async (
  req: PayloadRequest,
  options: ResolvedOptions,
  parent: FolderId | null
): Promise<string> => {
  const [key] = await keysForInsert(req, options, {
    at: options.newItemPosition === "top" ? "start" : "end",
    count: 1,
    parent,
  });

  return key;
};

import type { Access, AccessResult, PayloadRequest, Where } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { FolderId, ItemRef, ResolvedOptions } from "../types.js";
import { createNestedRequest } from "./nestedRequest.js";

/** One question to a collection's `access.update` or `access.delete`. */
export type AccessCheck = {
  collection: string;
  /** What the access function sees as `data`; for `update` only. */
  data?: Record<string, unknown>;
  id: FolderId;
  /** Names the check in the result of `findRefusedChecks`; unique per call. */
  key: string;
  operation: "delete" | "update";
};

const isWhere = (result: AccessResult): result is Where =>
  Boolean(result) && typeof result === "object";

/**
 * Asks the collection's own `access.update` (or `access.delete`) about each check, as the user of
 * `req`, and returns the keys of the checks it refuses. A function answering `false` refuses; one
 * answering a `Where` allows only a document that the `Where` matches, found with one query per
 * distinct `Where` (the pattern of Payload's orderable fields, which also tests the stored
 * document against the access result). A collection with no such function refuses everything.
 *
 * The functions run on a copy of `req`, so a host function that makes a nested Local API call
 * cannot change the caller's context or locale.
 */
export const findRefusedChecks = async ({
  checks,
  req,
}: {
  checks: AccessCheck[];
  req: PayloadRequest;
}): Promise<Set<string>> => {
  const { payload } = req;
  const refused = new Set<string>();
  const nestedRequest = createNestedRequest(req);
  const groups = new Map<string, { checks: AccessCheck[]; collection: string; where: Where }>();

  for (const check of checks) {
    const access = payload.collections[toCollectionSlug(check.collection)]?.config.access?.[
      check.operation
    ] as Access | undefined;
    if (!access) {
      refused.add(check.key);
      continue;
    }
    const result = await access({
      data: check.data,
      // The id type of the host's database is not known to the plugin's types.
      id: check.id as number,
      req: nestedRequest,
      slug: check.collection,
    });
    if (result === true) {
      continue;
    }
    if (!isWhere(result)) {
      refused.add(check.key);
      continue;
    }
    const groupKey = `${check.collection}\u0000${JSON.stringify(result)}`;
    const group = groups.get(groupKey) ?? {
      checks: [],
      collection: check.collection,
      where: result,
    };
    group.checks.push(check);
    groups.set(groupKey, group);
  }

  for (const { checks: groupChecks, collection, where } of groups.values()) {
    const { docs } = await payload.db.find({
      collection: toCollectionSlug(collection),
      pagination: false,
      req: nestedRequest,
      select: { id: true },
      where: { and: [{ id: { in: groupChecks.map((check) => check.id) } }, where] },
    });
    const matched = new Set((docs as Array<{ id: FolderId }>).map((doc) => String(doc.id)));
    for (const check of groupChecks) {
      if (!matched.has(String(check.id))) {
        refused.add(check.key);
      }
    }
  }

  return refused;
};

/**
 * What the user of `req` may do with one tree item, the `access` of a tree row (spec section
 * 10.2). `publish` is `update` evaluated with `_status: 'published'`, the same question a move of a
 * published page asks (spec section 9), so a host that gates publishing inside `update` shows it.
 */
export const getItemAccess = async ({
  item,
  req,
}: {
  item: ItemRef;
  req: PayloadRequest;
}): Promise<{ delete: boolean; publish: boolean; update: boolean }> => {
  const refused = await findRefusedChecks({
    checks: [
      { collection: item.collection, data: {}, id: item.id, key: "update", operation: "update" },
      {
        collection: item.collection,
        data: { _status: "published" },
        id: item.id,
        key: "publish",
        operation: "update",
      },
      { collection: item.collection, id: item.id, key: "delete", operation: "delete" },
    ],
    req,
  });

  return {
    delete: !refused.has("delete"),
    publish: !refused.has("publish"),
    update: !refused.has("update"),
  };
};

/**
 * Whether the user of `req` may verify and repair the tree (spec section 9, decision 5):
 * `access.repair` when the host set it, else a user for whom the folders' `update` access passes
 * outright and `access.move` passes. `access.move` is asked with no items, because "every item"
 * cannot be listed; a gate that refuses some items but not an empty move lets the user through.
 */
export const canRepairTree = async ({
  options,
  req,
}: {
  options: ResolvedOptions;
  req: PayloadRequest;
}): Promise<boolean> => {
  if (options.access.repair) {
    return Boolean(await options.access.repair({ req: createNestedRequest(req) }));
  }
  if (!req.user) {
    return false;
  }
  const nestedRequest = createNestedRequest(req);
  const update = req.payload.collections[toCollectionSlug(options.folders.slug)]?.config.access
    ?.update as Access | undefined;
  if (!update || (await update({ req: nestedRequest, slug: options.folders.slug })) !== true) {
    return false;
  }

  return options.access.move
    ? Boolean(await options.access.move({ items: [], req: nestedRequest, toFolder: null }))
    : true;
};

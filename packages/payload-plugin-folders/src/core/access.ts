import type { Access, AccessResult, PayloadRequest, SelectType, Where } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { FolderId, ItemRef, ResolvedOptions } from "../types.js";
import { createNestedRequest } from "./nestedRequest.js";
import { isPublishedStatus } from "./pageRecords.js";

/** One question to a collection's `access.update` or `access.delete`. */
export type AccessCheck = {
  collection: string;
  /** What the access function sees as `data`; for `update` only. */
  data?: Record<string, unknown>;
  /**
   * Makes the check stand for many documents of the collection: the function is asked once, with
   * no `id`, the way Payload asks for a bulk update, and a `Where` result is tested with one query
   * on `scope`, which matches exactly `ids`. Any document the `Where` does not match refuses the
   * whole check. A host that decides per document returns a `Where`, which then applies to every
   * page; an `id` of one page would make the answer depend on which page was picked.
   */
  group?: { ids: FolderId[]; scope: Where };
  /** The document asked about; absent for a `group`. */
  id?: FolderId;
  /** Names the check in the result of `findRefusedChecks`; unique per call. */
  key: string;
  operation: "delete" | "update";
};

const isWhere = (result: AccessResult): result is Where =>
  Boolean(result) && typeof result === "object";

const idsOf = (check: AccessCheck): FolderId[] =>
  check.group?.ids ?? (check.id === undefined ? [] : [check.id]);

type WhereGroup = { checks: AccessCheck[]; collection: string; scope: Where | null; where: Where };

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
  const groups = new Map<string, WhereGroup>();

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
      id: check.id as number | undefined,
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
    const scope = check.group?.scope ?? null;
    const groupKey = `${check.collection}\u0000${JSON.stringify(result)}\u0000${scope ? JSON.stringify(scope) : ""}`;
    const group = groups.get(groupKey) ?? {
      checks: [],
      collection: check.collection,
      scope,
      where: result,
    };
    group.checks.push(check);
    groups.set(groupKey, group);
  }

  for (const { checks: groupChecks, collection, scope, where } of groups.values()) {
    const { docs } = await payload.db.find({
      collection: toCollectionSlug(collection),
      pagination: false,
      req: nestedRequest,
      select: { id: true },
      where: {
        and: [scope ?? { id: { in: groupChecks.flatMap((check) => idsOf(check)) } }, where],
      },
    });
    const matched = new Set((docs as Array<{ id: FolderId }>).map((doc) => String(doc.id)));
    for (const check of groupChecks) {
      if (!idsOf(check).every((id) => matched.has(String(id)))) {
        refused.add(check.key);
      }
    }
  }

  return refused;
};

// Names no title and no path: a title is read with no read access check.
export const forbiddenRenameMessage =
  "Renaming this folder changes a live URL: you need publish rights";

/**
 * Whether the user of `req` is refused the publish question (`update` with `_status: 'published'`,
 * spec section 9) for any published page in `folderIds`. A page there keeps its folder and order
 * key when its folder moves or is renamed; only its URL changes. So the question is asked once per
 * collection and folder, with no `orderKey`, and a `Where` result is tested with one query on that
 * folder (decision 23). A collection without drafts has no unpublished pages, so each row counts.
 * Collections and folders with no published page are never asked.
 */
export const isPublishRefusedBeneath = async ({
  folderIds,
  options,
  req,
}: {
  folderIds: FolderId[];
  options: ResolvedOptions;
  req: PayloadRequest;
}): Promise<boolean> => {
  const { payload } = req;
  const checks: AccessCheck[] = [];

  for (const page of Object.values(options.collections)) {
    const hasDrafts = Boolean(
      payload.collections[toCollectionSlug(page.slug)]?.config.versions?.drafts
    );
    const { docs } = (await payload.db.find({
      collection: toCollectionSlug(page.slug),
      locale: "all",
      pagination: false,
      req,
      select: { ...(hasDrafts ? { _status: true } : {}), folder: true } as SelectType,
      where: { folder: { in: folderIds } },
    })) as unknown as { docs: Array<Record<string, unknown>> };

    const groupsByFolder = new Map<string, { folder: FolderId; ids: FolderId[] }>();
    for (const row of docs) {
      if (hasDrafts && !isPublishedStatus(row._status)) {
        continue;
      }
      const folder =
        typeof row.folder === "object" && row.folder
          ? (row.folder as { id: FolderId }).id
          : (row.folder as FolderId);
      const group = groupsByFolder.get(String(folder)) ?? { folder, ids: [] };
      group.ids.push(row.id as FolderId);
      groupsByFolder.set(String(folder), group);
    }
    for (const { folder, ids } of groupsByFolder.values()) {
      checks.push({
        collection: page.slug,
        data: { _status: "published", folder },
        group: { ids, scope: { folder: { equals: folder } } },
        key: `${page.slug}:${folder}`,
        operation: "update",
      });
    }
  }

  return (await findRefusedChecks({ checks, req })).size > 0;
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

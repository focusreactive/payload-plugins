import type { Payload, PayloadRequest } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { FolderId, ItemRef, MirrorTarget, PathChange, ResolvedOptions } from "../types.js";
import { createNestedRequest } from "./nestedRequest.js";
import { registerOperationHandler, startOperation } from "./operations.js";
import { buildUrl } from "./paths.js";
import { getPageDefaultLocale } from "./uniqueness.js";

/** One `@payloadcms/plugin-redirects` row to write: a prefixed old path and the page that took it over. */
export type MirrorRow = {
  collection: string;
  /** The old path with the frontend's locale prefix, the redirects plugin's unique `from`. */
  from: string;
  id: FolderId;
  /** The new path with the same prefix; the target of a row whose collection cannot be referenced. */
  to: string;
};

/** Keys per query, far below the bound-parameter limit of either adapter. */
const keyChunkSize = 500;

/**
 * The path with the frontend's locale prefix. It does not go through `buildUrl`, which lowercases:
 * a legacy `/About` is a URL visitors reached, and a redirect that starts at `/about` would never
 * match it.
 */
const withPrefix = (
  path: string,
  locale: string | null,
  options: ResolvedOptions,
  payload: Payload
): string => {
  const prefix = buildUrl("/", locale, {
    defaultLocale: getPageDefaultLocale(payload),
    localePrefix: options.urls.localePrefix,
  });
  if (prefix === "/") {
    return path;
  }

  return path === "/" ? prefix : `${prefix}${path}`;
};

/**
 * A row per published page path that changed (spec section 5.6). A change with no old path (a
 * create), no new path or the same path has nothing to redirect, and a draft-only change is not a
 * URL anyone visited. Two changes with one prefixed `from` (a host that turned the locale prefix
 * off) collapse to the first, since the plugin keeps one row per `from`.
 */
export const planMirrorRows = (
  changes: PathChange[],
  options: ResolvedOptions,
  payload: Payload
): MirrorRow[] => {
  const rowByFrom = new Map<string, MirrorRow>();
  for (const change of changes) {
    if (
      change.kind !== "page" ||
      !change.published ||
      change.from === null ||
      change.to === null ||
      change.from === change.to
    ) {
      continue;
    }
    const from = withPrefix(change.from, change.locale, options, payload);
    if (!rowByFrom.has(from)) {
      rowByFrom.set(from, {
        collection: change.collection,
        from,
        id: change.id,
        to: withPrefix(change.to, change.locale, options, payload),
      });
    }
  }

  return [...rowByFrom.values()];
};

/** The prefixed paths that live pages occupy after `changes`, which no redirect may start from. */
const livePathsOf = (
  changes: PathChange[],
  options: ResolvedOptions,
  payload: Payload
): string[] => [
  ...new Set(
    changes
      .filter(
        (change): change is PathChange & { to: string } =>
          change.kind === "page" && change.published && change.to !== null
      )
      .map((change) => withPrefix(change.to, change.locale, options, payload))
  ),
];

const chunk = <TValue>(values: TValue[]): TValue[][] => {
  const chunks: TValue[][] = [];
  for (let index = 0; index < values.length; index += keyChunkSize) {
    chunks.push(values.slice(index, index + keyChunkSize));
  }

  return chunks;
};

const rowData = (row: MirrorRow, mirror: MirrorTarget): Record<string, unknown> => {
  const isReference = mirror.referenceCollections.includes(row.collection);

  return {
    from: row.from,
    // The unused half is cleared too, so a row that switches between the two forms keeps no stale value.
    to: isReference
      ? { reference: { relationTo: row.collection, value: row.id }, type: "reference", url: null }
      : { reference: null, type: "custom", url: row.to },
    ...(mirror.redirectType === null ? {} : { type: mirror.redirectType }),
  };
};

/**
 * Upserts rows by `from` (the redirects plugin's unique field) through the Local API, so the host's
 * own hooks on its redirects collection run (a cache revalidation, for one), on the caller's
 * transaction: a rollback leaves none. Idempotent, so a retried step writes nothing twice.
 */
const upsertMirrorRows = async ({
  mirror,
  req,
  rows,
}: {
  mirror: MirrorTarget;
  req: PayloadRequest;
  rows: MirrorRow[];
}): Promise<void> => {
  const { payload } = req;
  const collection = toCollectionSlug(mirror.collectionSlug);
  const nested = createNestedRequest(req);

  for (const rowsOfChunk of chunk(rows)) {
    const { docs } = await payload.find({
      collection,
      depth: 0,
      overrideAccess: true,
      pagination: false,
      req: nested,
      select: { from: true } as never,
      where: { from: { in: rowsOfChunk.map((row) => row.from) } },
    });
    const existingIdByFrom = new Map(
      (docs as Array<{ from: string; id: FolderId }>).map((doc) => [doc.from, doc.id])
    );

    for (const row of rowsOfChunk) {
      const existingId = existingIdByFrom.get(row.from);
      const common = {
        collection,
        data: rowData(row, mirror) as never,
        depth: 0,
        overrideAccess: true,
        req: nested,
        select: { id: true } as never,
      };
      if (existingId === undefined) {
        await payload.create(common);
      } else {
        await payload.update({ ...common, id: existingId });
      }
    }
  }
};

/** Deletes the rows whose `from` is one of `froms`, `keyChunkSize` at a time. */
const deleteMirrorRowsFrom = async ({
  froms,
  mirror,
  req,
}: {
  froms: string[];
  mirror: MirrorTarget;
  req: PayloadRequest;
}): Promise<void> => {
  const nested = createNestedRequest(req);
  for (const fromsOfChunk of chunk(froms)) {
    await req.payload.delete({
      collection: toCollectionSlug(mirror.collectionSlug),
      depth: 0,
      overrideAccess: true,
      req: nested,
      select: { id: true } as never,
      where: { from: { in: fromsOfChunk } },
    });
  }
};

/**
 * Spec section 5.6, the plugin-redirects mirror, for the page paths in `changes`: rows for the
 * published pages whose path changed, then no row left that starts at a path a live page now holds.
 * Call it beside `settleRedirectRows`, inside the same transaction and tree lock, with the same
 * `write` flag (`redirects: false` writes no row but still frees the paths).
 *
 * Above `limits.maxSyncDocuments` rows the writes are stored as a `mirrorRedirects` operation for
 * the admin to step (spec section 5.8) and its id is answered; the stale rows are deleted at once,
 * because that is one query per 500 paths. Answers null when everything was written here.
 */
export const settleMirror = async ({
  changes,
  options,
  req,
  write,
}: {
  changes: PathChange[];
  options: ResolvedOptions;
  req: PayloadRequest;
  write: boolean;
}): Promise<{ operationId: FolderId | null }> => {
  const { mirror } = options.redirects;
  if (!mirror || !(write || options.redirects.enabled)) {
    return { operationId: null };
  }
  const { payload } = req;
  const livePaths = livePathsOf(changes, options, payload);
  if (livePaths.length > 0) {
    await deleteMirrorRowsFrom({ froms: livePaths, mirror, req });
  }
  if (!write) {
    return { operationId: null };
  }

  // A row that starts at a live path is deleted again at once, so it is never written.
  const live = new Set(livePaths);
  const rows = planMirrorRows(changes, options, payload).filter((row) => !live.has(row.from));
  if (rows.length === 0) {
    return { operationId: null };
  }
  if (rows.length > options.limits.maxSyncDocuments) {
    const { id } = await startOperation({ items: rows, kind: "mirrorRedirects", req });

    return { operationId: id };
  }
  await upsertMirrorRows({ mirror, req, rows });

  return { operationId: null };
};

/**
 * The count a preview reports as "N entries will be added to Redirects": the rows `settleMirror`
 * would write, 0 when the mirror is off.
 */
export const countMirrorRows = (
  changes: PathChange[],
  options: ResolvedOptions,
  payload: Payload
): number => {
  if (!options.redirects.mirror) {
    return 0;
  }
  const live = new Set(livePathsOf(changes, options, payload));

  return planMirrorRows(changes, options, payload).filter((row) => !live.has(row.from)).length;
};

/**
 * Spec section 5.6, "Delete ... deletes rows whose target is the deleted document", for the
 * mirror: the rows that reference the document go. A row of a collection the redirects plugin cannot
 * reference is a custom URL and has no link to the document, so it stays.
 */
export const deleteMirrorRowsTargeting = async ({
  options,
  ref,
  req,
}: {
  options: ResolvedOptions;
  ref: ItemRef;
  req: PayloadRequest;
}): Promise<void> => {
  const { mirror } = options.redirects;
  if (!mirror?.referenceCollections.includes(ref.collection)) {
    return;
  }
  await req.payload.delete({
    collection: toCollectionSlug(mirror.collectionSlug),
    depth: 0,
    overrideAccess: true,
    req: createNestedRequest(req),
    select: { id: true } as never,
    where: {
      and: [
        { "to.reference.relationTo": { equals: ref.collection } },
        { "to.reference.value": { equals: ref.id } },
      ],
    },
  });
};

registerOperationHandler("mirrorRedirects", {
  run: async ({ options, req }, units) => {
    const { mirror } = options.redirects;
    // A host that turned the mirror off while an operation was open has nothing left to write.
    if (mirror) {
      await upsertMirrorRows({ mirror, req, rows: units as MirrorRow[] });
    }
  },
});

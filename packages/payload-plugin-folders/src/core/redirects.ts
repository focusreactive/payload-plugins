import type { PayloadRequest, Where } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import { folderRedirectsSlug } from "../constants.js";
import type { FolderId, ItemRef, PathChange, ResolvedOptions } from "../types.js";
import { noLocaleKey } from "./locales.js";

/** One row of `folder-redirects`: an old path and the document that took it over. */
export type RedirectRow = {
  fromPath: string;
  /** A `folderPrefix` row stands for every path beneath `fromPath`. */
  kind: "folderPrefix" | "page";
  /** `null` when localization is off. */
  locale: string | null;
  target: ItemRef;
};

/** A path a document now occupies, which a stale row of the same kind must not keep claiming. */
export type TakenPath = { kind: RedirectRow["kind"]; locale: string | null; path: string };

/** Keys per query, far below the bound-parameter limit of either adapter. */
const keyChunkSize = 500;

/** `<locale>:<path>`, with locale `-` when localization is off (spec section 5.6). */
export const lookupKeyOf = (locale: string | null, path: string): string =>
  `${locale ?? noLocaleKey}:${path}`;

/**
 * Whether a write that is not a move request writes redirect rows: `context.foldersRedirects`
 * when the caller set it (false opts one save out), else `redirects.enabled`.
 */
export const shouldWriteRedirects = (req: PayloadRequest, options: ResolvedOptions): boolean => {
  const fromContext = req.context?.foldersRedirects;

  return typeof fromContext === "boolean" ? fromContext : options.redirects.enabled;
};

type ChangedItem = { changes: PathChange[]; kind: "folder" | "page"; ref: ItemRef };

/**
 * A page row per published locale in which the page's URL changed. A change with no old path
 * (the page had none) or no new path (it has none now) has nothing to redirect from or to, and a
 * change that touched only a draft is not a URL anyone could have visited.
 */
export const planPageRedirectRows = (changes: PathChange[]): RedirectRow[] =>
  changes
    .filter(
      (change) =>
        change.kind === "page" && change.published && change.from !== null && change.to !== null
    )
    .map((change) => ({
      fromPath: change.from as string,
      kind: "page",
      locale: change.locale,
      target: { collection: change.collection, id: change.id },
    }));

/**
 * One `folderPrefix` row per locale in which the folder's own path changed and at least one
 * published page beneath it changed URL too, so a folder with nothing but drafts leaves no row.
 * A folder whose fields are not localized serves every page locale, so it writes a row for each
 * locale in which a published page changed. `changes` hold the folder, its subfolders and the
 * pages beneath (spec section 5.6: one row stands for every path beneath it).
 */
export const planFolderPrefixRows = ({
  changes,
  folder,
}: {
  changes: PathChange[];
  folder: ItemRef;
}): RedirectRow[] => {
  const publishedPageLocales = new Set(
    changes
      .filter((change) => change.kind === "page" && change.published)
      .map((change) => change.locale)
  );
  const rows = new Map<string, RedirectRow>();

  for (const change of changes) {
    if (
      change.kind !== "folder" ||
      change.collection !== folder.collection ||
      String(change.id) !== String(folder.id) ||
      change.from === null
    ) {
      continue;
    }
    const locales =
      change.locale === null
        ? [...publishedPageLocales]
        : [change.locale].filter((locale) => publishedPageLocales.has(locale));
    for (const locale of locales) {
      const row: RedirectRow = {
        fromPath: change.from,
        kind: "folderPrefix",
        locale,
        target: folder,
      };
      rows.set(lookupKeyOf(locale, change.from), row);
    }
  }

  return [...rows.values()];
};

/** The rows a moved or renamed item writes: the page's own, or the folder's prefix rows. */
export const redirectRowsOfMovedItem = (item: ChangedItem): RedirectRow[] =>
  item.kind === "page"
    ? planPageRedirectRows(item.changes)
    : planFolderPrefixRows({ changes: item.changes, folder: item.ref });

/**
 * The paths that live documents occupy after `changes`: published pages (a root page counts as its
 * folder's path) and every folder. A draft is not at its path yet; the publish takes it then.
 */
export const takenPathsOf = (changes: PathChange[]): TakenPath[] =>
  changes
    .filter(
      (change): change is PathChange & { to: string } =>
        change.to !== null && (change.kind === "folder" || change.published)
    )
    .map((change) => ({
      kind: change.kind === "folder" ? "folderPrefix" : "page",
      locale: change.locale,
      path: change.to,
    }));

const chunk = <TValue>(values: TValue[]): TValue[][] => {
  const chunks: TValue[][] = [];
  for (let index = 0; index < values.length; index += keyChunkSize) {
    chunks.push(values.slice(index, index + keyChunkSize));
  }

  return chunks;
};

/**
 * Spec section 5.6: when a document takes a path that a row's `fromPath` names, the row goes. A
 * page row goes when any page takes its path; a prefix row only when a folder takes it, because a
 * page at `/about` does not make `/about/contact` any less moved. Run it inside the write's
 * transaction, and before `writeRedirectRows` so a swap of two paths keeps the rows it just wrote.
 */
export const clearTakenRedirectRows = async ({
  req,
  taken,
}: {
  req: PayloadRequest;
  taken: TakenPath[];
}): Promise<void> => {
  for (const kind of ["page", "folderPrefix"] as const) {
    const keys = [
      ...new Set(
        taken
          .filter((entry) => entry.kind === kind)
          .map((entry) => lookupKeyOf(entry.locale, entry.path))
      ),
    ];
    for (const keysOfChunk of chunk(keys)) {
      await req.payload.db.deleteMany({
        collection: toCollectionSlug(folderRedirectsSlug),
        req,
        where: { and: [{ kind: { equals: kind } }, { lookupKey: { in: keysOfChunk } }] },
      });
    }
  }
};

/**
 * Upserts rows by `lookupKey`: one read per chunk of keys finds the rows that exist, and each row
 * is then one update or one insert (the adapter has no bulk insert). A newer change of the same
 * old path replaces the target. Written on the caller's request, so they join its transaction and
 * a rollback leaves none. The collection is not localized and unversioned, so these are
 * database-level writes that run no hook and touch no page data.
 */
export const writeRedirectRows = async ({
  req,
  rows,
}: {
  req: PayloadRequest;
  rows: RedirectRow[];
}): Promise<void> => {
  const { payload } = req;
  const collection = toCollectionSlug(folderRedirectsSlug);
  const rowByKey = new Map(rows.map((row) => [lookupKeyOf(row.locale, row.fromPath), row]));

  for (const keysOfChunk of chunk([...rowByKey.keys()])) {
    const { docs } = await payload.db.find({
      collection,
      pagination: false,
      req,
      select: { lookupKey: true },
      where: { lookupKey: { in: keysOfChunk } },
    });
    const existingIdByKey = new Map(
      (docs as Array<{ id: FolderId; lookupKey: string }>).map((doc) => [doc.lookupKey, doc.id])
    );
    const now = new Date().toISOString();

    for (const lookupKey of keysOfChunk) {
      const row = rowByKey.get(lookupKey) as RedirectRow;
      const data = {
        fromPath: row.fromPath,
        kind: row.kind,
        locale: row.locale,
        lookupKey,
        target: { relationTo: row.target.collection, value: row.target.id },
        updatedAt: now,
      };
      const existingId = existingIdByKey.get(lookupKey);
      if (existingId === undefined) {
        await payload.db.create({
          collection,
          data: { ...data, createdAt: now },
          req,
          returning: false,
        });
      } else {
        await payload.db.updateOne({ collection, data, id: existingId, req, returning: false });
      }
    }
  }
};

export type FolderPrefixRedirect = {
  folder: FolderId;
  /** The locale whose path changed; `null` when localization is off. */
  locale: string | null;
  /** The folder's old full path, which stands for every path beneath it. */
  fromPath: string;
};

/**
 * Writes one `folderPrefix` row per changed locale (spec section 5.6) inside the write's
 * transaction, so a failed rename leaves no row.
 */
export const writeFolderPrefixRedirects = ({
  folderCollection,
  redirects,
  req,
}: {
  folderCollection: string;
  redirects: FolderPrefixRedirect[];
  req: PayloadRequest;
}): Promise<void> =>
  writeRedirectRows({
    req,
    rows: redirects.map(
      (redirect): RedirectRow => ({
        fromPath: redirect.fromPath,
        kind: "folderPrefix",
        locale: redirect.locale,
        target: { collection: folderCollection, id: redirect.folder },
      })
    ),
  });

/**
 * Spec section 5.6, "Delete writes no redirect, and deletes rows whose target is the deleted
 * document": no row may point at a document that is gone.
 */
export const deleteRedirectsTargeting = async ({
  ref,
  req,
}: {
  ref: ItemRef;
  req: PayloadRequest;
}): Promise<void> => {
  const where: Where = {
    and: [
      { "target.relationTo": { equals: ref.collection } },
      { "target.value": { equals: ref.id } },
    ],
  };
  await req.payload.db.deleteMany({
    collection: toCollectionSlug(folderRedirectsSlug),
    req,
    where,
  });
};

/**
 * The one entry a move, a rename and a publish share for the rows of a set of path changes: the
 * paths the changes occupy are freed of stale rows first, then, unless `write` is false, the rows
 * of `rows` are written. `redirects: false` (or `write: false`) writes no row but still frees the
 * paths: a row for a path with a live document would only mislead.
 */
export const settleRedirectRows = async ({
  clear,
  req,
  rows,
}: {
  /** The paths the change occupies now; their stale rows are deleted. */
  clear: TakenPath[];
  req: PayloadRequest;
  /** The rows to write, empty when redirects are off for this change. */
  rows: RedirectRow[];
}): Promise<void> => {
  if (clear.length > 0) {
    await clearTakenRedirectRows({ req, taken: clear });
  }
  if (rows.length > 0) {
    await writeRedirectRows({ req, rows });
  }
};

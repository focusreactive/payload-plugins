import type { Payload, PayloadRequest } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { FolderId, ResolvedOptions } from "../types.js";
import { getFolderLocaleKeys, noLocaleKey } from "./locales.js";
import type { ValuesByLocale } from "./locales.js";
import { joinPath, pathDepth } from "./paths.js";

/** A folder row as stored: one value per locale for name, slug and fullPath, with no fallback. */
export type FolderRecord = {
  /** Page collection slugs the folder accepts; empty means every page type. */
  allowedTypes: string[];
  ancestorIds: string | null;
  defaultType: string | null;
  depth: number | null;
  fullPath: ValuesByLocale;
  id: FolderId;
  /** Whether the folder copies its `allowedTypes` to every subfolder (spec section 2.3). */
  lockSubfolderTypes: boolean;
  name: ValuesByLocale;
  orderKey: string | null;
  parent: FolderId | null;
  slug: ValuesByLocale;
  /** The row exactly as the read returned it (every locale), for writes that must carry it whole. */
  storedRow: Record<string, unknown>;
  structureRevision: number;
  /** The folder whose lock put this folder's `allowedTypes` here, when one did. */
  typesLockedBy: FolderId | null;
};

const toValuesByLocale = (value: unknown): ValuesByLocale => {
  if (value && typeof value === "object") {
    return { ...(value as ValuesByLocale) };
  }

  return typeof value === "string" ? { [noLocaleKey]: value } : {};
};

const toId = (value: unknown): FolderId | null => {
  if (typeof value === "number" || typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object" && "id" in value) {
    return toId((value as { id: unknown }).id);
  }

  return null;
};

/** Turns a database row read with `locale: "all"` into a `FolderRecord`. */
export const toFolderRecord = (row: Record<string, unknown>): FolderRecord => ({
  allowedTypes: Array.isArray(row.allowedTypes)
    ? row.allowedTypes.filter((type): type is string => typeof type === "string")
    : [],
  ancestorIds: typeof row.ancestorIds === "string" ? row.ancestorIds : null,
  defaultType: typeof row.defaultType === "string" ? row.defaultType : null,
  depth: typeof row.depth === "number" ? row.depth : null,
  fullPath: toValuesByLocale(row.fullPath),
  id: row.id as FolderId,
  lockSubfolderTypes: Boolean(row.lockSubfolderTypes),
  name: toValuesByLocale(row.name),
  orderKey: typeof row.orderKey === "string" ? row.orderKey : null,
  parent: toId(row.parent),
  slug: toValuesByLocale(row.slug),
  storedRow: row,
  structureRevision: typeof row.structureRevision === "number" ? row.structureRevision : 0,
  typesLockedBy: toId(row.typesLockedBy),
});

/**
 * Reads one folder straight from the database with every locale and no fallback (spec section
 * 3.2). It bypasses the Local API's data loader, whose per-request cache could hand back a path
 * from before a write made earlier in the same request.
 */
export const readFolderRecord = async (
  req: PayloadRequest,
  options: ResolvedOptions,
  id: FolderId
): Promise<FolderRecord | null> => {
  const row = (await req.payload.db.findOne({
    collection: toCollectionSlug(options.folders.slug),
    locale: "all",
    req,
    where: { id: { equals: id } },
  })) as Record<string, unknown> | null;

  return row ? toFolderRecord(row) : null;
};

export type FolderPathPlan = {
  ancestorIds: string;
  depth: number;
  /** Complete in every locale: a locale without its own segment already carries the fallback. */
  fullPath: Record<string, string>;
  segments: Record<string, string>;
};

/**
 * Spec section 3.2: `fullPath[L] = parent.fullPath[L] + '/' + segment[L]`, where a locale without
 * a segment of its own takes the default locale's, and a parent without a path in `L` takes its
 * default-locale path.
 */
export const planFolderPaths = ({
  defaultLocaleKey,
  keys,
  parent,
  slug,
}: {
  defaultLocaleKey: string;
  keys: string[];
  parent: FolderRecord | null;
  slug: ValuesByLocale;
}): FolderPathPlan => {
  const segments: Record<string, string> = {};
  const fullPath: Record<string, string> = {};

  for (const key of keys) {
    const segment = slug[key] || slug[defaultLocaleKey] || "";
    segments[key] = segment;
    const parentPath = parent
      ? parent.fullPath[key] || parent.fullPath[defaultLocaleKey] || ""
      : "";
    fullPath[key] = segment === "" ? "" : joinPath(parentPath, segment);
  }

  return {
    ancestorIds: parent ? `${parent.ancestorIds ?? "/"}${parent.id}/` : "/",
    depth: pathDepth(fullPath[defaultLocaleKey] ?? ""),
    fullPath,
    segments,
  };
};

/** Every locale slot a folder write has to cover. */
export const getFolderKeys = (payload: Payload, options: ResolvedOptions): string[] =>
  getFolderLocaleKeys(payload, options);

/** Whether `candidateId` is the folder itself or sits in the ancestor chain of `parent`. */
export const wouldCreateCycle = (
  candidateId: FolderId,
  parent: Pick<FolderRecord, "ancestorIds" | "id">
): boolean =>
  String(parent.id) === String(candidateId) ||
  (parent.ancestorIds ?? "").includes(`/${candidateId}/`);

/**
 * A `parent` or `folder` value as the tree stores it: a folder id, or `null` for the top level.
 * `0`, an empty string and similar are never a root marker (spec section 3.1) and come back
 * invalid, so the caller can answer 400 instead of letting the foreign key fail.
 */
export const normalizeFolderReference = (
  value: unknown
): { id: FolderId | null; invalid: boolean } => {
  if (value === undefined || value === null) {
    return { id: null, invalid: false };
  }
  const id = toId(value);
  if (id === null || id === 0 || id === "" || id === "0") {
    return { id: null, invalid: true };
  }

  return { id, invalid: false };
};

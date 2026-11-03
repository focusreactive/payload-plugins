import type { PayloadRequest, SelectType } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { FolderId, ResolvedOptions, ResolvedPageCollection } from "../types.js";
import { normalizeFolderReference } from "./folderRecords.js";
import { getFallbackLocaleKey, noLocaleKey } from "./locales.js";
import { isPublishedInLocale } from "./pageRecords.js";
import { isValidSegment } from "./slugify.js";
import type { StructureField, TreeIssue } from "./treeIssues.js";
import { getPageLocaleKeys } from "./uniqueness.js";

/** Pages read per query; the rows are small, the batches only bound one query's result. */
export const pageBatchSize = 1000;

/** A segment per locale slot, only where one is set. A plain value sits in `noLocaleKey`. */
export type OwnSegments = Record<string, string>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The segments a stored value holds, keyed by locale; an empty string counts as none. */
export const toOwnSegments = (value: unknown): OwnSegments => {
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string" && entry[1] !== ""
      )
    );
  }

  return typeof value === "string" && value !== "" ? { [noLocaleKey]: value } : {};
};

/** What a read returns for locale `key`: its own segment, else the default locale's. */
export const effectiveSegmentOf = (own: OwnSegments, key: string, defaultLocale: string): string =>
  own[key] || own[defaultLocale] || own[noLocaleKey] || "";

/** One page's facts, the least that the later checks and the repair need. */
export type PageFact = {
  collection: string;
  createdAt: string | null;
  folder: FolderId | null;
  id: FolderId;
  isFolderRoot: boolean;
  /** Segments that fail the pattern: the stored one and the lowercase fix, when it is valid. */
  invalid: Array<{ fixedSegment: string | null; key: string; segment: string }>;
  /** The locale slots in which the page is live (published itself, or through fallback). */
  liveKeys: string[];
  orderKey: string | null;
  /** The segment field as stored, per locale. */
  ownSlug: OwnSegments;
  /** `pathSegment` as stored, per locale. */
  ownStored: OwnSegments;
  structureRevision: number;
};

const readPageFields = (page: ResolvedPageCollection, hasDrafts: boolean): SelectType =>
  ({
    ...(hasDrafts ? { _status: true } : {}),
    ...(page.trash ? { deletedAt: true } : {}),
    [page.segmentField]: true,
    createdAt: true,
    folder: true,
    isFolderRoot: true,
    orderKey: true,
    pathSegment: true,
    structureRevision: true,
  }) as SelectType;

const toText = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : null;

export const hasDraftsEnabled = (req: PayloadRequest, page: ResolvedPageCollection): boolean =>
  Boolean(req.payload.collections[toCollectionSlug(page.slug)]?.config.versions?.drafts);

/** The segment locales where the stored `pathSegment` and the page's own segment differ. */
export const segmentDrift = (
  slug: OwnSegments,
  stored: OwnSegments
): Array<{ expected: string | null; locale: string | null; stored: string | null }> =>
  [...new Set([...Object.keys(slug), ...Object.keys(stored)])]
    .filter((key) => (slug[key] ?? null) !== (stored[key] ?? null))
    .map((key) => ({
      expected: slug[key] ?? null,
      locale: key === noLocaleKey ? null : key,
      stored: stored[key] ?? null,
    }));

export type StaleVersion = { fields: StructureField[]; id: FolderId };

const normalizeKey = (value: unknown): string | null => toText(value);

const normalizeRevision = (value: unknown): number => (typeof value === "number" ? value : 0);

/**
 * The structure of a page's latest version that differs from its main row (spec sections 5.3 and
 * 5.9). A version written before the plugin has no `folder` or `orderKey`, which reads as null,
 * and a missing revision as 0, the way the main row's does.
 */
export const staleStructureFields = (
  main: { folder: FolderId | null; orderKey: unknown; structureRevision: unknown },
  version: { folder?: unknown; orderKey?: unknown; structureRevision?: unknown }
): StructureField[] => {
  const fields: StructureField[] = [];
  const versionFolder = normalizeFolderReference(version.folder).id;
  if (
    (main.folder === null ? null : String(main.folder)) !==
    (versionFolder === null ? null : String(versionFolder))
  ) {
    fields.push("folder");
  }
  if (normalizeKey(main.orderKey) !== normalizeKey(version.orderKey)) {
    fields.push("orderKey");
  }
  if (normalizeRevision(main.structureRevision) !== normalizeRevision(version.structureRevision)) {
    fields.push("structureRevision");
  }

  return fields;
};

const lowercaseFix = (
  segment: string,
  atSiteRoot: boolean,
  options: ResolvedOptions
): string | null => {
  const lowercase = segment.toLowerCase();
  if (lowercase === segment || !isValidSegment(lowercase, { atSiteRoot })) {
    return null;
  }

  return atSiteRoot && options.reservedRootSegments.includes(lowercase) ? null : lowercase;
};

/**
 * Reads every page of one collection in batches of `pageBatchSize`, walking the ids in order so a
 * batch never repeats a row, and returns each live row's facts. A trashed page is out of the tree
 * and skipped. For a collection with drafts, each batch's latest versions are read too, and the
 * ones whose structure differs from the main row come back as `staleVersions`.
 */
export const readPageFacts = async ({
  options,
  page,
  req,
}: {
  options: ResolvedOptions;
  page: ResolvedPageCollection;
  req: PayloadRequest;
}): Promise<{ facts: PageFact[]; staleVersions: StaleVersion[] }> => {
  const { payload } = req;
  const hasDrafts = hasDraftsEnabled(req, page);
  const keys = getPageLocaleKeys(payload);
  const fallbackKey = getFallbackLocaleKey(payload);
  const select = readPageFields(page, hasDrafts);
  const facts: PageFact[] = [];
  const staleVersions: StaleVersion[] = [];
  let lastId: FolderId | null = null;

  for (;;) {
    const { docs } = (await payload.db.find({
      collection: toCollectionSlug(page.slug),
      limit: pageBatchSize,
      locale: "all",
      pagination: false,
      req,
      select,
      sort: "id",
      ...(lastId === null ? {} : { where: { id: { greater_than: lastId } } }),
    })) as unknown as { docs: Array<Record<string, unknown>> };
    if (docs.length === 0) {
      break;
    }
    lastId = docs.at(-1)?.id as FolderId;

    const rows = docs.filter((row) => !(page.trash && row.deletedAt));
    for (const row of rows) {
      const folder = normalizeFolderReference(row.folder).id;
      const isFolderRoot = Boolean(row.isFolderRoot);
      const ownSlug = toOwnSegments(row[page.segmentField]);
      const invalid = isFolderRoot
        ? []
        : Object.entries(ownSlug)
            .filter(([, segment]) => !isValidSegment(segment, { atSiteRoot: folder === null }))
            .map(([key, segment]) => ({
              fixedSegment: lowercaseFix(segment, folder === null, options),
              key,
              segment,
            }));
      facts.push({
        collection: page.slug,
        createdAt: toText(row.createdAt),
        folder,
        id: row.id as FolderId,
        invalid,
        isFolderRoot,
        liveKeys: keys.filter((key) =>
          isPublishedInLocale(row._status, key, hasDrafts, fallbackKey)
        ),
        orderKey: toText(row.orderKey),
        ownSlug,
        ownStored: toOwnSegments(row.pathSegment),
        structureRevision: normalizeRevision(row.structureRevision),
      });
    }

    if (hasDrafts && rows.length > 0) {
      const mainById = new Map(rows.map((row) => [String(row.id), row]));
      const { docs: versions } = (await payload.db.findVersions({
        collection: toCollectionSlug(page.slug),
        pagination: false,
        req,
        select: {
          parent: true,
          version: { folder: true, orderKey: true, structureRevision: true },
        } as SelectType,
        where: {
          and: [{ latest: { equals: true } }, { parent: { in: rows.map((row) => row.id) } }],
        },
      })) as unknown as {
        docs: Array<{ parent: FolderId; version?: Record<string, unknown> }>;
      };
      for (const version of versions) {
        const main = mainById.get(String(version.parent));
        if (!main) {
          continue;
        }
        const fields = staleStructureFields(
          {
            folder: normalizeFolderReference(main.folder).id,
            orderKey: main.orderKey,
            structureRevision: main.structureRevision,
          },
          version.version ?? {}
        );
        if (fields.length > 0) {
          staleVersions.push({ fields, id: version.parent });
        }
      }
    }

    if (docs.length < pageBatchSize) {
      break;
    }
  }

  return { facts, staleVersions };
};

/**
 * The `pageSegment` issues of one page, from its drift per locale. A locale of a page in a
 * duplicate-path clash (`heldKeys`) is listed apart as not fixable: its saved segment is what the
 * page is reached by now, and writing the segment it was edited to would hand the page over to the
 * other claimant's URL. A locale with no saved segment is backfilled even in a clash, the way the
 * install flow gives the oldest page the path.
 */
export const pageSegmentIssues = (
  page: ResolvedPageCollection,
  fact: PageFact,
  heldKeys: ReadonlySet<string>
): TreeIssue[] => {
  const segments = segmentDrift(fact.ownSlug, fact.ownStored);
  const isHeld = (segment: { locale: string | null }): boolean =>
    heldKeys.has(segment.locale ?? noLocaleKey);
  const writable = segments.filter((segment) => !isHeld(segment));
  const held = segments.filter((segment) => isHeld(segment));
  const issues: TreeIssue[] = [];

  if (writable.length > 0) {
    issues.push({
      fixable: true,
      item: { collection: page.slug, id: fact.id },
      kind: "pageSegment",
      message: `${page.slug} ${fact.id} has no saved path segment matching its ${page.segmentField}; its URL is wrong or missing`,
      segments: writable,
    });
  }
  if (held.length > 0) {
    issues.push({
      fixable: false,
      item: { collection: page.slug, id: fact.id },
      kind: "pageSegment",
      message: `${page.slug} ${fact.id} has a saved path segment that differs from its ${page.segmentField}, and another item has the URL it would take; repair leaves it`,
      segments: held,
    });
  }

  return issues;
};

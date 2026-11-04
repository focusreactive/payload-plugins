import type { PayloadRequest, SelectType } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { FolderId, ItemRef, ResolvedOptions } from "../types.js";
import { noLocaleKey } from "./locales.js";
import type { IssueItem, TreeIssue } from "./treeIssues.js";

/** Ids per title query; a listed result names at most a few thousand items. */
const titleBatchSize = 500;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A stored title in the default locale, else the first locale that has one; a plain value as it is. */
const toTitle = (value: unknown, defaultLocale: string): string | null => {
  if (typeof value === "string") {
    return value === "" ? null : value;
  }
  if (!isRecord(value)) {
    return null;
  }
  const preferred = value[defaultLocale];
  if (typeof preferred === "string" && preferred !== "") {
    return preferred;
  }
  const other = Object.values(value).find((entry) => typeof entry === "string" && entry !== "");

  return typeof other === "string" ? other : null;
};

const itemKey = (collection: string, id: FolderId): string => `${collection}:${id}`;

const refsOf = (issue: TreeIssue, foldersSlug: string): ItemRef[] => {
  const refs: ItemRef[] = [];
  if ("item" in issue) {
    refs.push(issue.item);
  }
  if ("items" in issue) {
    refs.push(...issue.items);
  }
  if (issue.kind === "multipleRootPages" && issue.folder !== null) {
    refs.push({ collection: foldersSlug, id: issue.folder });
  }
  if (
    (issue.kind === "orderKeyMissing" ||
      issue.kind === "orderKeyEqual" ||
      issue.kind === "orderKeyInvalid") &&
    issue.parent !== null
  ) {
    refs.push({ collection: foldersSlug, id: issue.parent });
  }

  return refs;
};

/** The title of every item named, in one query per collection and batch. */
const readTitles = async (
  req: PayloadRequest,
  options: ResolvedOptions,
  refs: ItemRef[]
): Promise<Map<string, string | null>> => {
  const { payload } = req;
  const defaultLocale = payload.config.localization
    ? payload.config.localization.defaultLocale
    : noLocaleKey;
  const idsByCollection = new Map<string, Set<FolderId>>();
  for (const { collection, id } of refs) {
    idsByCollection.set(collection, (idsByCollection.get(collection) ?? new Set()).add(id));
  }
  const titles = new Map<string, string | null>();

  for (const [collection, idSet] of idsByCollection) {
    const titleField =
      collection === options.folders.slug ? "name" : options.collections[collection]?.titleField;
    if (!titleField) {
      continue;
    }
    const ids = [...idSet];
    for (let start = 0; start < ids.length; start += titleBatchSize) {
      const { docs } = (await payload.db.find({
        collection: toCollectionSlug(collection),
        locale: "all",
        pagination: false,
        req,
        select: { [titleField]: true } as SelectType,
        where: { id: { in: ids.slice(start, start + titleBatchSize) } },
      })) as unknown as { docs: Array<Record<string, unknown>> };
      for (const doc of docs) {
        titles.set(
          itemKey(collection, doc.id as FolderId),
          toTitle(doc[titleField], defaultLocale)
        );
      }
    }
  }

  return titles;
};

/**
 * The listed issues with each item they name carrying its `kind` and `title`, so a dialog names
 * the folder or page instead of its id. One query per collection for the items of what is listed,
 * not for every issue found, so the cost stays bounded by what a result lists.
 */
export const withItemTitles = async (
  req: PayloadRequest,
  options: ResolvedOptions,
  issues: TreeIssue[]
): Promise<TreeIssue[]> => {
  const foldersSlug = options.folders.slug;
  const titles = await readTitles(
    req,
    options,
    issues.flatMap((issue) => refsOf(issue, foldersSlug))
  );
  const name = (item: IssueItem): IssueItem => ({
    ...item,
    kind: item.collection === foldersSlug ? "folder" : "page",
    title: titles.get(itemKey(item.collection, item.id)) ?? null,
  });
  const folderTitle = (id: FolderId | null): string | null =>
    id === null ? null : (titles.get(itemKey(foldersSlug, id)) ?? null);

  return issues.map((issue): TreeIssue => {
    switch (issue.kind) {
      case "folderPath":
      case "folderCycle":
      case "folderParentMissing":
      case "folderSlugMissing":
      case "pageSegment":
      case "invalidSegment":
      case "staleVersion": {
        return { ...issue, item: name(issue.item) };
      }
      case "duplicatePath": {
        return { ...issue, items: issue.items.map(name) };
      }
      case "multipleRootPages": {
        return { ...issue, folderTitle: folderTitle(issue.folder), items: issue.items.map(name) };
      }
      case "orderKeyMissing":
      case "orderKeyEqual":
      case "orderKeyInvalid": {
        return { ...issue, items: issue.items.map(name), parentTitle: folderTitle(issue.parent) };
      }
      case "danglingRedirect":
      case "mirrorSlashForm":
      case "treeStateRows": {
        return issue;
      }
      default: {
        return issue;
      }
    }
  });
};

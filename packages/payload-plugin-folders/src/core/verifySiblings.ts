import { generateNKeysBetween } from "payload/shared";

import type { FolderId, ItemRef } from "../types.js";
import { noLocaleKey, toLocaleOrNull } from "./locales.js";
import { compareSiblings, isUsableOrderKey, planInsertKeys } from "./orderKeys.js";
import type { KeyRewrite, SiblingRow } from "./orderKeys.js";
import type { PageFact } from "./verifyPages.js";
import { effectiveSegmentOf } from "./verifyPages.js";
import type { PlannedFolder } from "./verifyFolders.js";
import { issueItemLimit, sampleItems } from "./treeIssues.js";
import type { TreeIssue } from "./treeIssues.js";
import { itemKey } from "./itemKey.js";

const hasKey = (row: SiblingRow): boolean =>
  typeof row.orderKey === "string" && row.orderKey !== "";

const parentKeyOf = (parent: FolderId | null): string => (parent === null ? "" : `/${parent}`);

const refOf = (row: SiblingRow): ItemRef => ({ collection: row.collection, id: row.id });

const orderKeyIssue = (
  kind: "orderKeyEqual" | "orderKeyInvalid" | "orderKeyMissing",
  parent: FolderId | null,
  rows: SiblingRow[]
): TreeIssue => {
  const place = parent === null ? "at the top level" : `in folder ${parent}`;
  const messages = {
    orderKeyEqual: `${rows.length} items ${place} share an order key with a sibling`,
    orderKeyInvalid: `${rows.length} items ${place} have an order key the generator cannot extend`,
    orderKeyMissing: `${rows.length} items ${place} have no order key`,
  };

  return {
    count: rows.length,
    fixable: true,
    items: sampleItems(rows.map(refOf)),
    kind,
    message: messages[kind],
    parent,
  };
};

/**
 * Spec sections 5.9 and 6 for the children of one folder. Rows without a key get keys after the
 * keyed siblings in `createdAt` order, so the visible order stays what the children read already
 * showed (keyed rows, then unkeyed by creation). Equal keys, and keys the generator cannot extend,
 * rebalance the whole group in its current order (ties by kind, collection and id), which is the
 * order the children read lists them in.
 */
export const planSiblingKeys = (
  parent: FolderId | null,
  rows: SiblingRow[]
): { issues: TreeIssue[]; rewrites: KeyRewrite[] } => {
  const missing = rows.filter((row) => !hasKey(row));
  const invalid = rows.filter((row) => hasKey(row) && !isUsableOrderKey(row.orderKey));
  const rowsByKey = new Map<string, SiblingRow[]>();
  for (const row of rows) {
    if (hasKey(row) && isUsableOrderKey(row.orderKey)) {
      rowsByKey.set(row.orderKey as string, [
        ...(rowsByKey.get(row.orderKey as string) ?? []),
        row,
      ]);
    }
  }
  const equal = [...rowsByKey.values()].filter((group) => group.length > 1).flat();
  if (missing.length + invalid.length + equal.length === 0) {
    return { issues: [], rewrites: [] };
  }

  const issues: TreeIssue[] = [
    ...(missing.length > 0 ? [orderKeyIssue("orderKeyMissing", parent, missing)] : []),
    ...(invalid.length > 0 ? [orderKeyIssue("orderKeyInvalid", parent, invalid)] : []),
    ...(equal.length > 0 ? [orderKeyIssue("orderKeyEqual", parent, equal)] : []),
  ];
  const sorted = [...rows].sort(compareSiblings);

  if (invalid.length > 0 || equal.length > 0) {
    const keys = generateNKeysBetween(null, null, sorted.length);
    const rewrites = sorted
      .map((row, index): KeyRewrite => ({ orderKey: keys[index], row }))
      .filter(({ orderKey, row }) => row.orderKey !== orderKey);

    return { issues, rewrites };
  }

  const keyed = sorted.filter((row) => hasKey(row));
  const unkeyed = sorted.filter((row) => !hasKey(row));
  const plan = planInsertKeys({ count: unkeyed.length, gap: keyed.length, siblings: keyed });

  return {
    issues,
    rewrites: [
      ...plan.rewrites,
      ...unkeyed.map((row, index): KeyRewrite => ({ orderKey: plan.keys[index], row })),
    ],
  };
};

/** Groups the children of every folder: folders and pages of every collection, trashed ones out. */
export const groupSiblings = ({
  facts,
  folders,
  foldersSlug,
}: {
  facts: PageFact[];
  folders: Map<string, PlannedFolder>;
  foldersSlug: string;
}): Map<string, { parent: FolderId | null; rows: SiblingRow[] }> => {
  const groups = new Map<string, { parent: FolderId | null; rows: SiblingRow[] }>();
  const add = (parent: FolderId | null, row: SiblingRow): void => {
    const key = parentKeyOf(parent);
    const group = groups.get(key) ?? { parent, rows: [] };
    group.rows.push(row);
    groups.set(key, group);
  };

  for (const { expectedParent, isTrashed, record } of folders.values()) {
    if (!isTrashed) {
      add(expectedParent, {
        collection: foldersSlug,
        createdAt:
          typeof record.storedRow.createdAt === "string" ? record.storedRow.createdAt : null,
        id: record.id,
        kind: "folder",
        orderKey: record.orderKey,
      });
    }
  }
  for (const fact of facts) {
    add(fact.folder, {
      collection: fact.collection,
      createdAt: fact.createdAt,
      id: fact.id,
      kind: "page",
      orderKey: fact.orderKey,
    });
  }

  return groups;
};

/** Rule 3 of spec section 2.6: more than one live page claims to be a folder's root page. */
export const findMultipleRootPages = (facts: PageFact[]): TreeIssue[] => {
  const rootsByFolder = new Map<string, { folder: FolderId | null; items: ItemRef[] }>();
  for (const fact of facts) {
    if (fact.isFolderRoot && fact.liveKeys.length > 0) {
      const key = parentKeyOf(fact.folder);
      const entry = rootsByFolder.get(key) ?? { folder: fact.folder, items: [] };
      entry.items.push({ collection: fact.collection, id: fact.id });
      rootsByFolder.set(key, entry);
    }
  }

  return [...rootsByFolder.values()]
    .filter(({ items }) => items.length > 1)
    .map(({ folder, items }) => ({
      count: items.length,
      fixable: false,
      folder,
      items: items.slice(0, issueItemLimit),
      kind: "multipleRootPages",
      message: `${items.length} pages are the root page of ${folder === null ? "the top level" : `folder ${folder}`}`,
    }));
};

export const duplicateClaimKey = (collection: string, id: FolderId, locale: string): string =>
  `${itemKey({ collection, id })}:${locale}`;

/**
 * Rules 1, 2 and 4 of spec section 2.6, compared in lowercase because URLs are canonical lowercase
 * (decision 22): two live non-root pages with one effective segment in a folder, a page with a
 * subfolder's segment, or two subfolders with one. Only pages live in the locale count, so two
 * drafts may share a segment, as the spec allows. Folder paths come from the plan, so a drifted
 * folder is compared at the path repair will give it.
 *
 * `claimedPages` names every page and locale in a clash, which the lowercase fix must not touch.
 */
export const findDuplicatePaths = ({
  defaultLocale,
  facts,
  folders,
  foldersSlug,
  pageKeys,
}: {
  defaultLocale: string;
  facts: PageFact[];
  folders: Map<string, PlannedFolder>;
  foldersSlug: string;
  pageKeys: string[];
}): { claimedPages: Set<string>; issues: TreeIssue[] } => {
  type Claim = { ref: ItemRef; segment: string };
  const claims = new Map<string, { claims: Claim[]; locale: string; parent: FolderId | null }>();
  const claim = (locale: string, parent: FolderId | null, segment: string, ref: ItemRef) => {
    if (segment === "") {
      return;
    }
    const key = `${locale}\u0000${parentKeyOf(parent)}\u0000${segment.toLowerCase()}`;
    const entry = claims.get(key) ?? { claims: [], locale, parent };
    entry.claims.push({ ref, segment });
    claims.set(key, entry);
  };

  for (const { expectedParent, isTrashed, plan, record } of folders.values()) {
    if (isTrashed || !plan) {
      continue;
    }
    for (const key of pageKeys) {
      claim(key, expectedParent, plan.segments[key] ?? plan.segments[noLocaleKey] ?? "", {
        collection: foldersSlug,
        id: record.id,
      });
    }
  }
  for (const fact of facts) {
    if (fact.isFolderRoot) {
      continue;
    }
    for (const key of fact.liveKeys) {
      claim(key, fact.folder, effectiveSegmentOf(fact.ownSlug, key, defaultLocale), {
        collection: fact.collection,
        id: fact.id,
      });
    }
  }

  const issues: TreeIssue[] = [];
  const claimedPages = new Set<string>();
  const folderPath = (parent: FolderId | null, locale: string): string => {
    const planned = parent === null ? null : folders.get(String(parent))?.plan;

    return planned ? planned.fullPath[locale] || planned.fullPath[noLocaleKey] || "" : "";
  };

  for (const { claims: group, locale, parent } of claims.values()) {
    if (group.length < 2) {
      continue;
    }
    for (const { ref } of group) {
      claimedPages.add(duplicateClaimKey(ref.collection, ref.id, locale));
    }
    const path = `${folderPath(parent, locale)}/${group[0].segment.toLowerCase()}`;
    issues.push({
      count: group.length,
      fixable: false,
      items: sampleItems(group.map(({ ref }) => ref)),
      kind: "duplicatePath",
      locale: toLocaleOrNull(locale),
      message: `${group.length} items claim ${path}${locale === noLocaleKey ? "" : ` in ${locale}`}`,
      path,
    });
  }

  return { claimedPages, issues };
};

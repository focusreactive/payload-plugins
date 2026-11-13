import { NotFound } from "payload";
import type { PayloadRequest } from "payload";

import { itemKey } from "../core/itemKey.js";
import { getAncestors } from "../core/treeAncestors.js";
import { getChildren } from "../core/treeChildren.js";
import { maxTreePageSize } from "../core/treeItems.js";
import { searchTree } from "../core/treeSearch.js";
import type { FolderId, ResolvedOptions, TreeItem } from "../types.js";
import { describeLocales, toRequestLocale } from "./locales.js";
import type { McpLocales } from "./locales.js";
import { runTool, toolRefusal, toolSuccess } from "./toolResult.js";
import type { FoldersMcpTool, FoldersMcpToolArguments } from "./types.js";

export const browseTreeRowLimit = 50;

type LocaleStatus = "draft" | "fallback" | "published";

type ValuesByLocale<Value> = Record<string, Value | null>;

type BrowseRowBase = {
  collection: string;
  /** The locales whose name or title, and whose slug, are the default locale's because they have none of their own. */
  fallbackIn: { label: string[]; slug: string[] };
  fullPath: ValuesByLocale<string>;
  id: FolderId;
  isFolderRoot: boolean;
  kind: "folder" | "page";
  slug: ValuesByLocale<string>;
  /** Pages only; folders have no status. */
  status: ValuesByLocale<LocaleStatus> | null;
};

export type BrowseRow = BrowseRowBase & {
  /** Folders: the number of items directly inside. */
  childCount?: number;
  /** Folders. */
  name?: ValuesByLocale<string>;
  /** Pages. */
  title?: ValuesByLocale<string>;
};

type ItemsByLocale = Map<string, TreeItem>;

/** Rows of every locale, grouped by item, in the order the first locale listed them. */
const groupByItem = (listings: Array<[string, TreeItem[]]>): Map<string, ItemsByLocale> => {
  const groups = new Map<string, ItemsByLocale>();
  for (const [locale, items] of listings) {
    for (const item of items) {
      const key = itemKey(item);
      const group = groups.get(key) ?? new Map<string, TreeItem>();
      group.set(locale, item);
      groups.set(key, group);
    }
  }

  return groups;
};

const toLocaleStatus = (item: TreeItem): LocaleStatus | null => {
  if (item.status === undefined) {
    return null;
  }
  if (item.statusIsFallback) {
    return "fallback";
  }

  return item.status === "draft" ? "draft" : "published";
};

const toRow = (group: ItemsByLocale, locales: McpLocales): BrowseRow => {
  const [first] = group.values();
  const perLocale = <Value>(pick: (item: TreeItem) => Value | null): ValuesByLocale<Value> =>
    Object.fromEntries(
      locales.codes.map((code) => {
        const item = group.get(code);

        return [code, item ? pick(item) : null];
      })
    );
  const codesWhere = (isFallback: (item: TreeItem) => boolean): string[] =>
    locales.codes.filter((code) => {
      const item = group.get(code);

      return item !== undefined && isFallback(item);
    });
  const isFolder = first.kind === "folder";
  const labels = perLocale((item) => item.title);

  return {
    collection: first.collection,
    fallbackIn: {
      label: codesWhere((item) => item.titleIsFallback),
      slug: codesWhere((item) => item.slugIsFallback),
    },
    fullPath: perLocale((item) => item.fullPath),
    id: first.id,
    isFolderRoot: Boolean(first.isFolderRoot),
    kind: first.kind,
    slug: perLocale((item) => item.slug),
    status: isFolder ? null : perLocale(toLocaleStatus),
    ...(isFolder ? { childCount: first.childCount ?? 0, name: labels } : { title: labels }),
  };
};

const labelsOf = (row: BrowseRow): ValuesByLocale<string> => row.name ?? row.title ?? {};

const describeStatus = (status: LocaleStatus | null | undefined): string => {
  if (status === "fallback") {
    return ", published through the default language";
  }

  return status ? `, ${status}` : "";
};

const describeRow = (row: BrowseRow, locales: McpLocales, lead = "-"): string => {
  const labels = labelsOf(row);
  const parts = locales.codes.map((code) => {
    const label = labels[code];
    if (label === null || label === undefined) {
      return `${code}: not available`;
    }
    const labelNote = row.fallbackIn.label.includes(code) ? " (default language's text)" : "";
    const path = row.fullPath[code] ? ` at ${row.fullPath[code]}` : " with no path yet";

    return `${code}: "${label}"${labelNote}${path}${describeStatus(row.status?.[code])}`;
  });
  const kind = row.kind === "folder" ? "folder" : `page in ${row.collection}`;
  const size = row.kind === "folder" ? `; ${row.childCount ?? 0} items inside` : "";
  const root = row.isFolderRoot ? "; the folder's own page" : "";

  return `${lead} ${kind} ${String(row.id)}: ${parts.join("; ")}${size}${root}`;
};

const buildText = ({
  ancestors,
  folder,
  hasMore,
  locales,
  rows,
  search,
}: {
  ancestors: BrowseRow[];
  folder: BrowseRow | null;
  hasMore: boolean;
  locales: McpLocales;
  rows: BrowseRow[];
  search: string | null;
}): string => {
  const languages = locales.isLocalized
    ? `Languages: ${locales.codes.map((code) => (code === locales.defaultLocale ? `${code} (default)` : code)).join(", ")}.`
    : "This site has one language, written as the key - in every value.";
  const place = folder
    ? `folder ${String(folder.id)} (${[...ancestors, folder]
        .map((row) => labelsOf(row)[locales.defaultLocale] ?? String(row.id))
        .join(" > ")})`
    : "the top level";
  const rowCount = rows.length === 1 ? "1 row" : `${rows.length} rows`;
  const heading = search
    ? `Search for "${search}" in ${place}: ${rowCount}.`
    : `Inside ${place}: ${rowCount}.`;
  const more = hasMore
    ? "There are more rows than shown. Narrow it with search or collection, or look inside a folder."
    : "";

  return [
    languages,
    heading,
    ...(folder ? [describeRow(folder, locales, "This is")] : []),
    ...rows.map((row) => describeRow(row, locales)),
    more,
  ]
    .filter((line) => line !== "")
    .join("\n");
};

/** The same row in a locale the search did not list it in, read from its folder's children. */
const fillMissingLocales = async ({
  groups,
  locales,
  req,
}: {
  groups: Map<string, ItemsByLocale>;
  locales: McpLocales;
  req: PayloadRequest;
}): Promise<void> => {
  const siblingsCache = new Map<string, Promise<Map<string, TreeItem>>>();
  const listSiblings = async (parent: FolderId | null, code: string) => {
    try {
      const { items } = await getChildren(req, {
        limit: maxTreePageSize,
        locale: toRequestLocale(code),
        parent,
      });

      return new Map(items.map((item) => [itemKey(item), item]));
    } catch (error) {
      // A page whose folder the user cannot read has no siblings to look in.
      if (error instanceof NotFound) {
        return new Map<string, TreeItem>();
      }
      throw error;
    }
  };
  const readSiblings = (parent: FolderId | null, code: string) => {
    const cacheKey = `${String(parent)}@${code}`;
    const cached = siblingsCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const read = listSiblings(parent, code);
    siblingsCache.set(cacheKey, read);

    return read;
  };

  for (const [key, group] of groups) {
    const [first] = group.values();
    for (const code of locales.codes) {
      if (!group.has(code)) {
        const found = (await readSiblings(first.parentId, code)).get(key);
        if (found) {
          group.set(code, found);
        }
      }
    }
  }
};

const readFolderContext = async ({
  folderId,
  locales,
  options,
  req,
}: {
  folderId: FolderId;
  locales: McpLocales;
  options: ResolvedOptions;
  req: PayloadRequest;
}): Promise<{ ancestors: BrowseRow[]; folder: BrowseRow }> => {
  const readings: Array<[string, Awaited<ReturnType<typeof getAncestors>>]> = [];
  for (const code of locales.codes) {
    readings.push([
      code,
      await getAncestors(
        req,
        {
          item: { collection: options.folders.slug, id: folderId },
          locale: toRequestLocale(code),
          withItems: true,
        },
        options
      ),
    ]);
  }
  const ancestors = [
    ...groupByItem(readings.map(([code, reading]) => [code, reading.items ?? []])),
  ].map(([, group]) => toRow(group, locales));
  const [folder] = [
    ...groupByItem(
      readings.flatMap(([code, reading]) => (reading.item ? [[code, [reading.item]] as const] : []))
    ),
  ].map(([, group]) => toRow(group, locales));

  return { ancestors, folder };
};

const readListing = async ({
  collection,
  folderId,
  locales,
  req,
  search,
}: {
  collection: string | null;
  folderId: FolderId | null;
  locales: McpLocales;
  req: PayloadRequest;
  search: string | null;
}): Promise<{ groups: Map<string, ItemsByLocale>; hasMore: boolean }> => {
  const listings: Array<[string, TreeItem[]]> = [];
  let hasMore = false;
  for (const code of locales.codes) {
    const locale = toRequestLocale(code);
    if (search) {
      const found = await searchTree(req, {
        folder: folderId,
        limit: browseTreeRowLimit,
        locale,
        query: search,
        scope: "folder",
        ...(collection ? { types: [collection] } : {}),
      });
      listings.push([code, found.items]);
      hasMore ||= found.truncated || found.items.length >= browseTreeRowLimit;
    } else {
      // A collection filter is applied after the read, so it reads the biggest page there is.
      const children = await getChildren(req, {
        limit: collection ? maxTreePageSize : browseTreeRowLimit,
        locale,
        parent: folderId,
      });
      listings.push([
        code,
        collection
          ? children.items.filter((item) => item.collection === collection)
          : children.items,
      ]);
      hasMore ||= children.hasMore;
    }
  }

  const groups = groupByItem(listings);
  if (search) {
    await fillMissingLocales({ groups, locales, req });
  }
  if (groups.size > browseTreeRowLimit) {
    hasMore = true;
  }

  return { groups, hasMore };
};

const readFolderId = (value: unknown): FolderId | null =>
  typeof value === "number" || typeof value === "string" ? value : null;

const browseTree = ({
  input,
  options,
  req,
}: FoldersMcpToolArguments & { options: ResolvedOptions }) =>
  runTool(async () => {
    const folderId = readFolderId(input.folder);
    const search =
      typeof input.search === "string" && input.search.trim() !== "" ? input.search.trim() : null;
    const collection = typeof input.collection === "string" ? input.collection : null;
    const locales = describeLocales(req.payload.config.localization);

    let context: { ancestors: BrowseRow[]; folder: BrowseRow } | null = null;
    if (folderId !== null) {
      try {
        context = await readFolderContext({ folderId, locales, options, req });
      } catch (error) {
        if (error instanceof NotFound) {
          return toolRefusal(`Folder ${String(folderId)} was not found, or you may not read it.`);
        }
        throw error;
      }
    }

    const { groups, hasMore } = await readListing({ collection, folderId, locales, req, search });
    const rows = [...groups.values()]
      .slice(0, browseTreeRowLimit)
      .map((group) => toRow(group, locales));
    const ancestors = context?.ancestors ?? [];
    const folder = context?.folder ?? null;

    return toolSuccess(buildText({ ancestors, folder, hasMore, locales, rows, search }), {
      ancestors,
      defaultLocale: locales.defaultLocale,
      folder,
      hasMore,
      locales: locales.codes,
      rows,
    });
  });

const description = `Shows what is in the site's content tree: the folders and pages inside one folder, or the results of a search, in every language of the site at once. Use it first, before you create or change anything, to see how the content is organised and what each language shows.

For every folder and page it gives the name or title, the URL segment (slug) and the full URL path in each language. For a page it also says, per language, whether it is published, a draft, or published only through the default language (fallback). For a folder it gives the number of items directly inside. A name, title or slug listed under fallbackIn is the default language's text shown because that language has none of its own.

Pass folder as the id of a folder to look inside it, or leave it out for the top level. Pass search to find items by words in a name, title or path, inside that folder and the folders below it. Pass collection to list only one kind of content. At most ${browseTreeRowLimit} rows come back, and hasMore says when there are more, so narrow the question. You only see what your own account may read.`;

export const buildBrowseTreeTool = (
  options: ResolvedOptions,
  collections: string[]
): FoldersMcpTool => ({
  access: ({ req }) => Boolean(req.user),
  annotations: {
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    readOnlyHint: true,
    title: "Browse the content tree",
  },
  description,
  handler: ({ input, req }) =>
    browseTree({ input: input as Record<string, unknown>, options, req }),
  input: {
    additionalProperties: false,
    properties: {
      collection: {
        description: "List only this kind of content: the folders collection or a page collection.",
        enum: collections,
        type: "string",
      },
      folder: {
        description: "The id of the folder to look inside. null or left out is the top level.",
        type: ["integer", "string", "null"],
      },
      search: {
        description:
          "Words to find in names, titles and paths. All words must match; put a phrase in double quotes.",
        type: "string",
      },
    },
    type: "object",
  },
});

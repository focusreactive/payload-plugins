import { draftMode } from "next/headers";
import type { DataFromCollectionSlug, Sort, Where } from "payload";

import type { EntityCollection } from "@/lib/config/entityRoutes";
import { cacheTag } from "@/lib/utils/cacheTags";
import { scopedCache } from "@/lib/utils/scopedCache";
import type { Locale } from "@/lib/types";

import { getPayloadClient } from "./payload-client";

export const ENTITY_RENDER_DEPTH = 3;

type ListableCollection = EntityCollection | "testimonials" | "posts";

export interface FindEntitiesOptions {
  locale: Locale;
  where?: Where;
  sort?: Sort;
  limit?: number;
  /** How deep relationships and images are populated. Lists default to 1, single records to 3. */
  depth?: number;
}

const hasDrafts = (collection: ListableCollection): boolean => collection !== "testimonials";

async function runFind<TSlug extends ListableCollection>(
  collection: TSlug,
  { locale, where, sort, limit = 0, depth = 1 }: FindEntitiesOptions,
  draft: boolean
): Promise<DataFromCollectionSlug<TSlug>[]> {
  const payload = await getPayloadClient();
  const published: Where[] =
    hasDrafts(collection) && !draft ? [{ _status: { equals: "published" } }] : [];

  const find = payload.find as unknown as (
    args: Record<string, unknown>
  ) => Promise<{ docs: unknown[] }>;
  const result = await find({
    collection,
    // Marks text for click-to-edit on draft reads only.
    context: { visualEditing: draft },
    depth,
    draft,
    // Join fields exist for the editor; pages query related records explicitly.
    joins: false,
    limit,
    locale,
    overrideAccess: true,
    pagination: limit > 0,
    sort,
    where: { and: [...published, ...(where ? [where] : [])] },
  });

  return result.docs as DataFromCollectionSlug<TSlug>[];
}

/**
 * Lists records of one collection. Published reads are cached under one tag that every record
 * collection clears on change, because one record shows on several pages.
 */
export async function findEntities<TSlug extends ListableCollection>(
  collection: TSlug,
  options: FindEntitiesOptions
): Promise<DataFromCollectionSlug<TSlug>[]> {
  const { isEnabled: draft } = await draftMode();

  if (draft) {
    return runFind(collection, options, true);
  }

  const tags = [cacheTag({ type: "entities" })];

  if (collection === "posts") {
    tags.push(cacheTag({ locale: options.locale, type: "postsList" }));
  }

  return scopedCache(
    () => runFind(collection, options, false),
    [collection, JSON.stringify(options)],
    {
      tags,
    }
  )();
}

export async function getEntityBySlug<TSlug extends EntityCollection>(
  collection: TSlug,
  slug: string,
  locale: Locale
): Promise<DataFromCollectionSlug<TSlug> | null> {
  const [doc] = await findEntities(collection, {
    depth: ENTITY_RENDER_DEPTH,
    limit: 1,
    locale,
    where: { slug: { equals: slug } },
  });

  return doc ?? null;
}

/** Keeps the editor's order when records were picked by hand. */
export function orderByIds<TDoc extends { id: number | string }>(
  docs: TDoc[],
  ids: (number | string)[]
): TDoc[] {
  const byId = new Map(docs.map((doc) => [String(doc.id), doc]));

  return ids.flatMap((id) => byId.get(String(id)) ?? []);
}

export const idOf = (value: number | string | { id: number | string }): number | string =>
  typeof value === "object" ? value.id : value;

/**
 * The header and footer for pages that are built from a record and so carry no header or footer
 * of their own: the first published one of each.
 */
export async function getSiteChrome(locale: Locale): Promise<{
  header: DataFromCollectionSlug<"header"> | null;
  footer: DataFromCollectionSlug<"footer"> | null;
}> {
  const { isEnabled: draft } = await draftMode();

  const read = async (isDraft: boolean) => {
    const payload = await getPayloadClient();
    const [headers, footers] = await Promise.all([
      payload.find({
        collection: "header",
        context: { visualEditing: isDraft },
        depth: 2,
        limit: 1,
        locale,
        overrideAccess: true,
        sort: "createdAt",
      }),
      payload.find({
        collection: "footer",
        context: { visualEditing: isDraft },
        depth: 2,
        draft: isDraft,
        limit: 1,
        locale,
        overrideAccess: true,
        sort: "createdAt",
      }),
    ]);

    return { footer: footers.docs[0] ?? null, header: headers.docs[0] ?? null };
  };

  if (draft) {
    return read(true);
  }

  return scopedCache(() => read(false), ["site-chrome", locale], {
    tags: [cacheTag({ type: "entities" })],
  })();
}

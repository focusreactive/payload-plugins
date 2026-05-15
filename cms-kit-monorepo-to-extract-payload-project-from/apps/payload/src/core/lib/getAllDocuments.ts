import type {
  CollectionSlug,
  DataFromCollectionSlug,
  Payload,
  Where,
} from "payload";

import type { Locale } from "../types";

interface GetAllDocumentsOptions {
  where?: Where;
  select?: Record<string, boolean>;
  sort?: string;
  limit?: number;
  depth?: number;
  overrideAccess?: boolean;
  locale?: Locale;
  draft?: boolean;
}

interface FindOptions {
  collection: CollectionSlug;
  where?: Where;
  select?: Record<string, boolean>;
  sort?: string;
  page?: number;
  limit?: number;
  depth?: number;
  overrideAccess?: boolean;
  locale?: Locale;
  draft?: boolean;
}

export async function getAllDocuments<TSlug extends CollectionSlug>(
  payload: Payload,
  collection: TSlug,
  options: GetAllDocumentsOptions = { locale: "en" as Locale }
): Promise<DataFromCollectionSlug<TSlug>[]> {
  const {
    where,
    select,
    sort = "-createdAt",
    limit = 1000,
    depth = 0,
    overrideAccess = false,
    locale,
    draft,
  } = options;

  const find = payload.find as unknown as (
    args: FindOptions
  ) => Promise<{ docs: DataFromCollectionSlug<TSlug>[]; totalPages: number }>;

  const firstPage = await find({
    collection,
    depth,
    draft,
    locale,
    overrideAccess,
    page: 1,
    select,
    sort,
    where,
  });

  const allDocs: DataFromCollectionSlug<TSlug>[] = [...firstPage.docs];
  const {totalPages} = firstPage;

  if (totalPages <= 1) {
    return allDocs;
  }

  for (let page = 2; page <= totalPages; page++) {
    const result = await find({
      collection,
      depth,
      limit,
      locale,
      overrideAccess,
      page,
      select,
      sort,
      where,
    });
    allDocs.push(...result.docs);
  }

  return allDocs;
}

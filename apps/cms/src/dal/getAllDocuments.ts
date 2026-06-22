import type { CollectionSlug, DataFromCollectionSlug, Payload, Where } from "payload";

import type { Locale } from "@/core/types";

interface GetAllDocumentsOptions {
  where?: Where;
  select?: Record<string, boolean>;
  sort?: string;
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
  depth?: number;
  overrideAccess?: boolean;
  locale?: Locale;
  draft?: boolean;
  pagination: false;
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
    depth = 0,
    overrideAccess = false,
    locale,
    draft,
  } = options;

  const find = payload.find as unknown as (
    args: FindOptions
  ) => Promise<{ docs: DataFromCollectionSlug<TSlug>[] }>;

  const result = await find({
    collection,
    depth,
    draft,
    locale,
    overrideAccess,
    pagination: false,
    select,
    sort,
    where,
  });

  return result.docs;
}

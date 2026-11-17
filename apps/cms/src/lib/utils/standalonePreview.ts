import type { CollectionConfig } from "payload";

import { generatePreviewPath } from "@/lib/utils/generatePreviewPath";
import { shouldIncludeLocalePrefix } from "@/lib/utils/localePrefix";

/**
 * Documents that have no URL of their own and are previewed on
 * `/[locale]/preview/<segment>/<id>`, keyed by that URL segment.
 */
export const STANDALONE_PREVIEW_COLLECTIONS = {
  footer: "footer",
  "global-block": "globalBlock",
  header: "header",
} as const;

export type StandalonePreviewSegment = keyof typeof STANDALONE_PREVIEW_COLLECTIONS;
export type StandalonePreviewCollection =
  (typeof STANDALONE_PREVIEW_COLLECTIONS)[StandalonePreviewSegment];

export const isStandalonePreviewSegment = (segment: string): segment is StandalonePreviewSegment =>
  Object.hasOwn(STANDALONE_PREVIEW_COLLECTIONS, segment);

const segmentOf = (collection: StandalonePreviewCollection): StandalonePreviewSegment =>
  (Object.keys(STANDALONE_PREVIEW_COLLECTIONS) as StandalonePreviewSegment[]).find(
    (segment) => STANDALONE_PREVIEW_COLLECTIONS[segment] === collection
  )!;

const standalonePreviewPath = (
  collection: StandalonePreviewCollection,
  id: unknown,
  locale: string
): string => {
  const prefix = shouldIncludeLocalePrefix(locale) ? `/${locale}` : "";

  return generatePreviewPath({
    collection,
    path: `${prefix}/preview/${segmentOf(collection)}/${id}`,
    slug: String(id ?? ""),
  });
};

type AdminConfig = NonNullable<CollectionConfig["admin"]>;

/** Live preview + preview button config for a standalone preview collection. */
export const createStandalonePreview = (
  collection: StandalonePreviewCollection
): Required<Pick<AdminConfig, "livePreview" | "preview">> => ({
  livePreview: {
    url: ({ data, locale }) =>
      standalonePreviewPath(collection, data?.id, locale.code ?? locale.fallbackLocale),
  },
  preview: (data, { locale }) => standalonePreviewPath(collection, data?.id, locale),
});

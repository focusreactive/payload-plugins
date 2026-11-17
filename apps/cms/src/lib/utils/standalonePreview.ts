import type { CollectionConfig } from "payload";

import { generatePreviewPath } from "@/lib/utils/generatePreviewPath";
import { shouldIncludeLocalePrefix } from "@/lib/utils/localePrefix";

type StandalonePreviewCollection = "globalBlock" | "header" | "footer";

type AdminConfig = NonNullable<CollectionConfig["admin"]>;

const standalonePreviewPath = (
  collection: StandalonePreviewCollection,
  segment: string,
  id: unknown,
  locale: string
): string => {
  const prefix = shouldIncludeLocalePrefix(locale) ? `/${locale}` : "";

  return generatePreviewPath({
    collection,
    path: `${prefix}/preview/${segment}/${id}`,
    slug: String(id ?? ""),
  });
};

/**
 * Live preview + preview button config for documents that have no URL of their own
 * (header, footer, global block). They render on `/[locale]/preview/<segment>/<id>`.
 */
export const createStandalonePreview = (
  collection: StandalonePreviewCollection,
  segment: string
): Required<Pick<AdminConfig, "livePreview" | "preview">> => ({
  livePreview: {
    url: ({ data, locale }) =>
      standalonePreviewPath(collection, segment, data?.id, locale.code ?? locale.fallbackLocale),
  },
  preview: (data, { locale }) => standalonePreviewPath(collection, segment, data?.id, locale),
});

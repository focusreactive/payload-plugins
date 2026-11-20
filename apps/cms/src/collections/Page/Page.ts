import { createParentField, createBreadcrumbsField } from "@payloadcms/plugin-nested-docs";
import type { CollectionConfig } from "payload";

import {
  createLivePreviewEditComponents,
  createLivePreviewVersions,
} from "@/lib/config/livePreview";
import { anyone, author, or, superAdmin, user } from "@/lib/access";
import { generatePreviewPath } from "@/lib/utils/generatePreviewPath";
import { buildUrl } from "@/lib/utils/path/buildUrl";
import { PUBLIC_URL_FIELD_NAME, publicUrlField } from "@/lib/fields/publicUrlField";
import { createSharedSlugField } from "@/lib/fields/slugField";
import type { Page as PageType } from "@/payload-types";

import { createBasePageFields } from "./basePageFields";
import { fixBreadcrumbDocIds } from "./hooks/fixBreadcrumbDocIds";
import { syncCurrentBreadcrumbUrl } from "./hooks/syncCurrentBreadcrumbUrl";
import { indexPageEmbedding, deletePageEmbedding } from "./hooks/indexEmbedding";
import { rememberPublishedPath } from "./hooks/publishedPath";
import { revalidateDelete, revalidatePage } from "./hooks/revalidatePage";
import { validateReservedSlug, validateReservedPath } from "./hooks/validateReservedSlug";

export const Page: CollectionConfig<"page"> = {
  access: {
    create: or(superAdmin, user, author),
    delete: or(superAdmin, user, author),
    read: anyone,
    update: or(superAdmin, user, author),
  },
  admin: {
    components: {
      edit: createLivePreviewEditComponents(),
    },
    defaultColumns: ["title", PUBLIC_URL_FIELD_NAME, "updatedAt"],
    group: "Content",
    livePreview: {
      url: ({ data, locale }) =>
        generatePreviewPath({
          collection: "page",
          path: buildUrl({
            collection: "page",
            breadcrumbs: data?.breadcrumbs,
            absolute: false,
            locale: locale.code ?? locale.fallbackLocale,
          }),
          slug: data?.slug,
        }),
    },
    preview: (data, { locale }) =>
      generatePreviewPath({
        collection: "page",
        path: buildUrl({
          collection: "page",
          breadcrumbs: data?.breadcrumbs as PageType["breadcrumbs"],
          absolute: false,
          locale,
        }),
        slug: data?.slug as string,
      }),
    useAsTitle: "title",
  },
  defaultPopulate: {
    breadcrumbs: true,
    slug: true,
    title: true,
  },
  fields: [
    {
      localized: true,
      name: "title",
      required: true,
      type: "text",
    },
    ...createBasePageFields({ withBlocksDefaultValue: true }),
    createSharedSlugField("page"),
    publicUrlField(),
    createParentField("page", {
      admin: {
        position: "sidebar",
      },
      filterOptions: ({ id }) => ({
        ...(id ? { id: { not_equals: id } } : {}),
        slug: { not_equals: "home" },
      }),
    }),
    createBreadcrumbsField("page", {
      admin: {
        position: "sidebar",
      },
      hooks: {
        beforeChange: [syncCurrentBreadcrumbUrl],
      },
      label: {
        en: "Page Breadcrumbs",
        es: "Breadcrumbs de la página",
      },
    }),
  ],
  folders: true,
  hooks: {
    afterChange: [revalidatePage, indexPageEmbedding],
    afterDelete: [revalidateDelete, deletePageEmbedding],
    beforeChange: [
      fixBreadcrumbDocIds,
      validateReservedSlug,
      validateReservedPath,
      rememberPublishedPath,
    ],
  },
  labels: {
    plural: {
      en: "Pages",
      es: "Páginas",
    },
    singular: {
      en: "Page",
      es: "Página",
    },
  },
  slug: "page",
  versions: createLivePreviewVersions(),
};

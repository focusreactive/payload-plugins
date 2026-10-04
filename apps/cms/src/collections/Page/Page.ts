import { createParentField, createBreadcrumbsField } from "@payloadcms/plugin-nested-docs";
import type { CollectionConfig } from "payload";

import { DEFAULT_VALUES } from "@/lib/constants/defaultValues";
import { anyone, author, or, superAdmin, user } from "@/lib/access";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { generatePreviewPath } from "@/lib/utils/generatePreviewPath";
import { buildUrl } from "@/lib/utils/path/buildUrl";
import { createSharedSlugField } from "@/lib/fields/slugField";
import type { Page as PageType } from "@/payload-types";

import { createBasePageFields } from "./basePageFields";
import { fixBreadcrumbDocIds } from "./hooks/fixBreadcrumbDocIds";
import { indexPageEmbedding, deletePageEmbedding } from "./hooks/indexEmbedding";
import { revalidateDelete, revalidatePage } from "./hooks/revalidatePage";
import { validateReservedSlug, validateReservedPath } from "./hooks/validateReservedSlug";
import { denyPublishForAuthors } from "@/lib/hooks/denyPublishForAuthors";

export const Page: CollectionConfig<"page"> = {
  access: {
    create: or(superAdmin, user, author),
    // Only administrators delete content (§5.7).
    delete: superAdmin,
    read: anyone,
    update: or(superAdmin, user, author),
  },
  // Pages referenced from links (cards, menus, redirects) need only their path, not their blocks;
  // full population made pages linking to siblings exceed Next's 2 MB data-cache limit.
  defaultPopulate: {
    breadcrumbs: true,
    parent: true,
    slug: true,
    title: true,
  },
  admin: {
    components: {
      edit: {
        PreviewButton: "/components/admin/VisualPreviewButton#VisualPreviewButton",
      },
    },
    defaultColumns: ["title", "slug", "updatedAt"],
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
  fields: [
    {
      admin: {
        description: {
          en: "The title of the page",
          es: 'El título de la página (por defecto: "Page")',
        },
      },
      defaultValue: createLocalizedDefault(DEFAULT_VALUES.collections.page.title),
      localized: true,
      name: "title",
      required: true,
      type: "text",
    },
    ...createBasePageFields({ withBlocksDefaultValue: true }),
    createSharedSlugField("page"),
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
      denyPublishForAuthors,
      fixBreadcrumbDocIds,
      validateReservedSlug,
      validateReservedPath,
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
  versions: {
    drafts: true,
    maxPerDoc: 50,
  },
};

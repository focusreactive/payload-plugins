import {
  createParentField,
  createBreadcrumbsField,
} from "@payloadcms/plugin-nested-docs";
import type { CollectionConfig } from "payload";

import { DEFAULT_VALUES } from "@/core/constants/defaultValues";
import { anyone, author, or, superAdmin, user } from "@/core/lib/access";
import { createLocalizedDefault } from "@/core/lib/createLocalizedDefault";
import { generatePreviewPath } from "@/core/lib/generatePreviewPath";
import { buildUrl } from "@/core/utils/path/buildUrl";
import { createSharedSlugField } from "@/fields/slugField";
import type { Page as PageType } from "@/payload-types";

import { createBasePageFields } from "./basePageFields";
import { fixBreadcrumbDocIds } from "./hooks/fixBreadcrumbDocIds";
import {
  indexPageEmbedding,
  deletePageEmbedding,
} from "./hooks/indexEmbedding";
import { revalidateDelete, revalidatePage } from "./hooks/revalidatePage";
import {
  validateReservedSlug,
  validateReservedPath,
} from "./hooks/validateReservedSlug";

export const Page: CollectionConfig<"page"> = {
  access: {
    create: or(superAdmin, user, author),
    delete: or(superAdmin, user, author),
    read: anyone,
    update: or(superAdmin, user, author),
  },
  admin: {
    defaultColumns: ["title", "slug", "updatedAt"],
    group: "Content",
    livePreview: {
      url: ({ data, locale }) => {
        return generatePreviewPath({
          slug: data?.slug,
          path: buildUrl({
            collection: "page",
            breadcrumbs: data?.breadcrumbs,
            absolute: false,
            locale: locale.code ?? locale.fallbackLocale,
          }),
          collection: "page",
        });
      },
    },
    preview: (data, { locale }) => {
      return generatePreviewPath({
        slug: data?.slug as string,
        path: buildUrl({
          collection: "page",
          breadcrumbs: data?.breadcrumbs as PageType["breadcrumbs"],
          absolute: false,
          locale,
        }),
        collection: "page",
      });
    },
    useAsTitle: "title",
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
      localized: true,
      defaultValue: createLocalizedDefault(
        DEFAULT_VALUES.collections.page.title
      ),
      admin: {
        description: {
          en: "The title of the page",
          es: 'El título de la página (por defecto: "Page")',
        },
      },
    },
    ...createBasePageFields({ withBlocksDefaultValue: true }),
    createSharedSlugField("page"),
    createParentField("page", {
      admin: {
        position: "sidebar",
      },
      filterOptions: ({ id }) => {
        return {
          slug: {
            not_equals: "home",
          },
          id: {
            not_equals: id,
          },
        };
      },
    }),
    createBreadcrumbsField("page", {
      label: {
        en: "Page Breadcrumbs",
        es: "Breadcrumbs de la página",
      },
      admin: {
        position: "sidebar",
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

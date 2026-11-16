import { createParentField, createBreadcrumbsField } from "@payloadcms/plugin-nested-docs";
import { SITE_TEMPLATES } from "@/lib/site/templates";
import type { CollectionConfig } from "payload";

import {
  createLiveBeforeDocumentControls,
  createLivePreviewVersions,
} from "@/lib/config/livePreview";
import { anyone, author, or, superAdmin, user } from "@/lib/access";
import { generatePreviewPath } from "@/lib/utils/generatePreviewPath";
import { buildUrl } from "@/lib/utils/path/buildUrl";
import { createSharedSlugField } from "@/lib/fields/slugField";
import type { Page as PageType } from "@/payload-types";

import { createBasePageFields, createPageChromeFields } from "./basePageFields";
import { fixBreadcrumbDocIds } from "./hooks/fixBreadcrumbDocIds";
import { indexPageEmbedding, deletePageEmbedding } from "./hooks/indexEmbedding";
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
      edit: {
        beforeDocumentControls: createLiveBeforeDocumentControls(),
        PreviewButton: "/components/admin/VisualPreviewButton#VisualPreviewButton",
      },
    },
    defaultColumns: ["title", "slug", "_status", "updatedAt"],
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
    listSearchableFields: ["title", "slug"],
    useAsTitle: "title",
  },
  fields: [
    {
      admin: {
        description: {
          en: "The title of the page",
          es: "El título de la página",
        },
      },
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
    {
      admin: {
        description: {
          en: "The page design: which of the site's stylesheets the page loads.",
          es: "El diseño de la página: qué hojas de estilo del sitio carga.",
        },
        position: "sidebar",
      },
      defaultValue: "default",
      label: { en: "Page design", es: "Diseño de página" },
      name: "template",
      options: SITE_TEMPLATES.map((template) => ({ label: template, value: template })),
      type: "select",
    },
    ...createPageChromeFields(),
    createBreadcrumbsField("page", {
      // Filled from the parent pages on save; the editor sets the parent, never the trail.
      admin: {
        hidden: true,
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
    beforeChange: [fixBreadcrumbDocIds, validateReservedSlug, validateReservedPath],
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

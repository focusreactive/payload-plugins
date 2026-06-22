import type { CollectionConfig } from "payload";

import { PLATFORM_DEFAULT_MEDIA_SLOT } from "@/core/constants/mediaDefaults";
import { anyone, or, user, superAdmin } from "@/core/lib/access";
import { createLocalizedDefault } from "@/core/lib/createLocalizedDefault";
import { getDefaultMediaId } from "@/dal/getDefaultMediaId";
import { link } from "@/fields/link";

import { revalidateResourcesUsingFooter } from "./hooks/revalidateResourcesUsingFooter";

export const Footer: CollectionConfig<"footer"> = {
  access: {
    create: or(superAdmin, user),
    delete: or(superAdmin, user),
    read: anyone,
    update: or(superAdmin, user),
  },
  admin: {
    defaultColumns: ["name", "logo"],
    group: "Global Components",
    useAsTitle: "name",
  },
  fields: [
    {
      admin: {
        description: {
          en: "The name of the footer",
          es: "El nombre del footer",
        },
      },
      defaultValue: createLocalizedDefault({
        en: "Footer",
        es: "Pie de página",
      }),
      name: "name",
      required: true,
      type: "text",
    },
    {
      admin: {
        description: {
          en: "The logo to display in the footer",
          es: "El logo a mostrar en el footer",
        },
      },
      defaultValue: async () => getDefaultMediaId(PLATFORM_DEFAULT_MEDIA_SLOT),
      name: "logo",
      relationTo: "media",
      required: true,
      type: "upload",
    },
    {
      label: { en: "Description", es: "Descripción" },
      localized: true,
      name: "description",
      type: "text",
    },
    {
      admin: {
        components: { RowLabel: "@/components/shared/components/RowLabel#RowLabelGroupName" },
        initCollapsed: true,
      },
      defaultValue: createLocalizedDefault({
        en: [
          {
            label: "Product",
            links: [
              { link: { label: "Features", newTab: false, type: "custom", url: "#" } },
              { link: { label: "Pricing", newTab: false, type: "custom", url: "#" } },
              { link: { label: "Changelog", newTab: false, type: "custom", url: "#" } },
              { link: { label: "Integrations", newTab: false, type: "custom", url: "#" } },
            ],
          },
          {
            label: "Company",
            links: [
              { link: { label: "About", newTab: false, type: "custom", url: "#" } },
              { link: { label: "Blog", newTab: false, type: "custom", url: "/blog" } },
              { link: { label: "Careers", newTab: false, type: "custom", url: "#" } },
              { link: { label: "Contact", newTab: false, type: "custom", url: "#" } },
            ],
          },
          {
            label: "Resources",
            links: [
              { link: { label: "Docs", newTab: false, type: "custom", url: "#" } },
              { link: { label: "Community", newTab: false, type: "custom", url: "#" } },
              { link: { label: "Status", newTab: false, type: "custom", url: "#" } },
              { link: { label: "Security", newTab: false, type: "custom", url: "#" } },
            ],
          },
        ],
        es: [
          {
            label: "Producto",
            links: [
              { link: { label: "Funciones", newTab: false, type: "custom", url: "#" } },
              { link: { label: "Precios", newTab: false, type: "custom", url: "#" } },
              { link: { label: "Novedades", newTab: false, type: "custom", url: "#" } },
              { link: { label: "Integraciones", newTab: false, type: "custom", url: "#" } },
            ],
          },
          {
            label: "Empresa",
            links: [
              { link: { label: "Acerca de", newTab: false, type: "custom", url: "#" } },
              { link: { label: "Blog", newTab: false, type: "custom", url: "/blog" } },
              { link: { label: "Empleo", newTab: false, type: "custom", url: "#" } },
              { link: { label: "Contacto", newTab: false, type: "custom", url: "#" } },
            ],
          },
          {
            label: "Recursos",
            links: [
              { link: { label: "Documentación", newTab: false, type: "custom", url: "#" } },
              { link: { label: "Comunidad", newTab: false, type: "custom", url: "#" } },
              { link: { label: "Estado", newTab: false, type: "custom", url: "#" } },
              { link: { label: "Seguridad", newTab: false, type: "custom", url: "#" } },
            ],
          },
        ],
      }),
      fields: [
        { label: { en: "Group label", es: "Etiqueta del grupo" }, localized: true, name: "label", required: true, type: "text" },
        {
          fields: [link({ appearances: false })],
          minRows: 1,
          name: "links",
          required: true,
          type: "array",
        },
      ],
      localized: true,
      maxRows: 4,
      name: "linkGroups",
      type: "array",
    },
    {
      admin: { initCollapsed: true },
      fields: [link({ appearances: false })],
      label: { en: "Legal links", es: "Enlaces legales" },
      localized: true,
      maxRows: 4,
      name: "legalLinks",
      type: "array",
    },
    {
      admin: {
        description: {
          en: "Copyright text shown at the bottom",
          es: "Texto de copyright al pie",
        },
      },
      defaultValue: createLocalizedDefault({
        en: "© 2026 Cadence Labs, Inc.",
        es: "© 2026 Cadence Labs, Inc.",
      }),
      localized: true,
      name: "copywriteText",
      type: "text",
    },
  ],
  hooks: {
    afterChange: [revalidateResourcesUsingFooter],
  },
  labels: {
    plural: {
      en: "Footers",
      es: "Pie de página",
    },
    singular: {
      en: "Footer",
      es: "Pie de página",
    },
  },
  slug: "footer",
  versions: {
    drafts: true,
    maxPerDoc: 50,
  },
};

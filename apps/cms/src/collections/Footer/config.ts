import type { CollectionConfig } from "payload";

import { anyone, or, user, superAdmin } from "@/lib/access";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { getDefaultMediaId } from "@/dal/getDefaultMediaId";
import { link, linkListRowLabel } from "@/lib/fields/link";
import {
  createLivePreviewEditComponents,
  createLivePreviewVersions,
} from "@/lib/config/livePreview";
import { ADMIN_GROUPS } from "@/lib/config/adminGroups";
import { createStandalonePreview } from "@/lib/utils/standalonePreview";

import { revalidateResourcesUsingFooter } from "./hooks/revalidateResourcesUsingFooter";

export const Footer: CollectionConfig<"footer"> = {
  access: {
    create: or(superAdmin, user),
    delete: or(superAdmin, user),
    read: anyone,
    update: or(superAdmin, user),
  },
  admin: {
    components: {
      edit: createLivePreviewEditComponents(),
    },
    defaultColumns: ["name", "logo", "_status", "updatedAt"],
    group: ADMIN_GROUPS.visualSections,
    useAsTitle: "name",
    ...createStandalonePreview("footer"),
  },
  fields: [
    {
      admin: {
        description: {
          en: "Internal name, shown only in the admin.",
          es: "Nombre interno, solo visible en el panel.",
        },
        position: "sidebar",
      },
      defaultValue: "Footer",
      label: { en: "Name", es: "Nombre" },
      name: "name",
      required: true,
      type: "text",
    },
    {
      fields: [
        {
          admin: { width: "50%" },
          defaultValue: async () => getDefaultMediaId(),
          label: { en: "Logo", es: "Logo" },
          name: "logo",
          relationTo: "media",
          required: true,
          type: "upload",
        },
        {
          admin: { width: "50%" },
          label: { en: "Description", es: "Descripción" },
          localized: true,
          name: "description",
          type: "textarea",
        },
      ],
      type: "row",
    },
    {
      admin: {
        components: { RowLabel: "@/components/admin/RowLabel#RowLabelGroupName" },
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
              { link: { customPage: "blog", label: "Blog", newTab: false, type: "customPage" } },
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
              { link: { customPage: "blog", label: "Blog", newTab: false, type: "customPage" } },
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
        {
          label: { en: "Column title", es: "Título de la columna" },
          localized: true,
          name: "label",
          required: true,
          type: "text",
        },
        {
          admin: { components: { RowLabel: linkListRowLabel }, initCollapsed: true },
          fields: [link({ label: false })],
          label: { en: "Links", es: "Enlaces" },
          labels: {
            plural: { en: "Links", es: "Enlaces" },
            singular: { en: "Link", es: "Enlace" },
          },
          minRows: 1,
          name: "links",
          required: true,
          type: "array",
        },
      ],
      label: { en: "Link columns", es: "Columnas de enlaces" },
      labels: {
        plural: { en: "Link columns", es: "Columnas de enlaces" },
        singular: { en: "Link column", es: "Columna de enlaces" },
      },
      localized: true,
      maxRows: 4,
      name: "linkGroups",
      type: "array",
    },
    {
      admin: { components: { RowLabel: linkListRowLabel }, initCollapsed: true },
      fields: [link({ label: false })],
      label: { en: "Legal links", es: "Enlaces legales" },
      labels: {
        plural: { en: "Legal links", es: "Enlaces legales" },
        singular: { en: "Legal link", es: "Enlace legal" },
      },
      localized: true,
      maxRows: 4,
      name: "legalLinks",
      type: "array",
    },
    {
      defaultValue: createLocalizedDefault({
        en: "© 2026 Cadence Labs, Inc.",
        es: "© 2026 Cadence Labs, Inc.",
      }),
      label: { en: "Copyright line", es: "Texto de copyright" },
      localized: true,
      name: "copyrightText",
      type: "text",
    },
  ],
  hooks: {
    afterChange: [revalidateResourcesUsingFooter],
  },
  labels: {
    plural: {
      en: "Footers",
      es: "Pies de página",
    },
    singular: {
      en: "Footer",
      es: "Pie de página",
    },
  },
  slug: "footer",
  versions: createLivePreviewVersions(),
};

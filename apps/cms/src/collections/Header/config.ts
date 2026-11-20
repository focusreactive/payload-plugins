import type { CollectionConfig, GroupField } from "payload";

import { anyone, or, user, superAdmin } from "@/lib/access";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { getDefaultMediaId } from "@/dal/getDefaultMediaId";
import { link } from "@/lib/fields/link";
import {
  createLivePreviewEditComponents,
  createLivePreviewVersions,
} from "@/lib/config/livePreview";
import { ADMIN_GROUPS } from "@/lib/config/adminGroups";
import { createStandalonePreview } from "@/lib/utils/standalonePreview";

import { revalidateResourcesUsingHeader } from "./hooks/revalidateResourcesUsingHeader";

export const Header: CollectionConfig<"header"> = {
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
    ...createStandalonePreview("header"),
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
      defaultValue: "Header",
      label: { en: "Name", es: "Nombre" },
      name: "name",
      type: "text",
    },
    {
      defaultValue: async () => getDefaultMediaId(),
      label: { en: "Logo", es: "Logo" },
      name: "logo",
      relationTo: "media",
      required: true,
      type: "upload",
    },
    {
      admin: {
        components: {
          RowLabel: "@/components/admin/RowLabel#RowLabel",
        },
        initCollapsed: true,
      },
      defaultValue: createLocalizedDefault({
        en: [
          { label: "Blog", link: { newTab: false, type: "custom", url: "/blog" }, type: "link" },
          { label: "Pricing", link: { newTab: false, type: "custom", url: "#" }, type: "link" },
        ],
        es: [
          { label: "Blog", link: { newTab: false, type: "custom", url: "/blog" }, type: "link" },
          { label: "Precios", link: { newTab: false, type: "custom", url: "#" }, type: "link" },
        ],
      }),
      fields: [
        {
          type: "row",
          fields: [
            {
              admin: { width: "60%" },
              label: { en: "Menu text", es: "Texto del menú" },
              localized: true,
              name: "label",
              required: true,
              type: "text",
            },
            {
              admin: { width: "40%" },
              defaultValue: "link",
              label: { en: "Opens", es: "Abre" },
              name: "type",
              options: [
                { label: { en: "A link", es: "Un enlace" }, value: "link" },
                { label: { en: "A dropdown menu", es: "Un menú desplegable" }, value: "dropdown" },
              ],
              required: true,
              type: "select",
            },
          ],
        },
        link({
          appearances: false,
          disableLabel: true,
          overrides: {
            admin: { condition: (_, siblingData) => siblingData?.type === "link" },
          },
        }),
        {
          admin: { condition: (_, siblingData) => siblingData?.type === "dropdown" },
          fields: [
            {
              fields: [
                {
                  defaultValue: false,
                  label: { en: "Show a featured card", es: "Mostrar una tarjeta destacada" },
                  name: "enabled",
                  type: "checkbox",
                },
                {
                  type: "row",
                  admin: { condition: (_, siblingData) => !!siblingData?.enabled },
                  fields: [
                    {
                      admin: { width: "40%" },
                      label: { en: "Label above title", es: "Texto sobre el título" },
                      localized: true,
                      name: "eyebrow",
                      type: "text",
                    },
                    {
                      admin: { width: "60%" },
                      label: { en: "Title", es: "Título" },
                      localized: true,
                      name: "title",
                      type: "text",
                    },
                  ],
                },
                {
                  admin: { condition: (_, siblingData) => !!siblingData?.enabled },
                  label: { en: "Description", es: "Descripción" },
                  localized: true,
                  name: "description",
                  type: "textarea",
                },
                link({
                  appearances: false,
                  customPageDbName: "hdr_ni_dd_ft_lnk_cp",
                  required: false,
                  overrides: {
                    admin: { condition: (_, siblingData) => !!siblingData?.enabled },
                  },
                }),
              ],
              label: { en: "Featured card", es: "Tarjeta destacada" },
              name: "featured",
              type: "group",
            },
            {
              admin: { initCollapsed: true },
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      admin: { width: "50%" },
                      label: { en: "Title", es: "Título" },
                      localized: true,
                      name: "title",
                      required: true,
                      type: "text",
                    },
                    {
                      admin: { width: "50%" },
                      label: { en: "Description", es: "Descripción" },
                      localized: true,
                      name: "description",
                      type: "text",
                    },
                  ],
                },
                link({
                  appearances: false,
                  customPageDbName: "hdr_ni_dd_lnks_lnk_cp",
                  disableLabel: true,
                }),
              ],
              label: { en: "Menu links", es: "Enlaces del menú" },
              labels: {
                plural: { en: "Links", es: "Enlaces" },
                singular: { en: "Link", es: "Enlace" },
              },
              minRows: 1,
              name: "links",
              type: "array",
            },
          ],
          label: { en: "Dropdown", es: "Desplegable" },
          name: "dropdown",
          type: "group",
        },
      ],
      label: { en: "Menu items", es: "Elementos del menú" },
      labels: {
        plural: { en: "Menu items", es: "Elementos del menú" },
        singular: { en: "Menu item", es: "Elemento del menú" },
      },
      localized: true,
      maxRows: 6,
      name: "navItems",
      type: "array",
    },
    {
      admin: { initCollapsed: true },
      fields: (link() as GroupField).fields,
      label: { en: "Buttons", es: "Botones" },
      labels: {
        plural: { en: "Buttons", es: "Botones" },
        singular: { en: "Button", es: "Botón" },
      },
      localized: true,
      maxRows: 2,
      name: "actions",
      type: "array",
    },
  ],
  hooks: {
    afterChange: [revalidateResourcesUsingHeader],
  },
  labels: {
    plural: {
      en: "Headers",
      es: "Cabeceras",
    },
    singular: {
      en: "Header",
      es: "Cabecera",
    },
  },
  slug: "header",
  versions: createLivePreviewVersions(),
};

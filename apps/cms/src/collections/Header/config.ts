import type { CollectionConfig, GroupField } from "payload";

import { PLATFORM_DEFAULT_MEDIA_SLOT } from "@/lib/constants/mediaDefaults";
import { anyone, or, user, superAdmin } from "@/lib/access";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { getDefaultMediaId } from "@/dal/getDefaultMediaId";
import { link } from "@/lib/fields/link";

import { revalidateResourcesUsingHeader } from "./hooks/revalidateResourcesUsingHeader";

export const Header: CollectionConfig<"header"> = {
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
          en: "The name of the header",
          es: "El nombre del header",
        },
      },
      defaultValue: createLocalizedDefault({ en: "Header", es: "Header" }),
      localized: true,
      name: "name",
      type: "text",
    },
    {
      admin: {
        description: {
          en: "Text shown in the top region bar",
          es: "Texto de la barra superior de región",
        },
      },
      localized: true,
      name: "tagline",
      type: "text",
    },
    {
      admin: {
        description: {
          en: "The logo to display in the header",
          es: "El logo a mostrar en el header",
        },
      },
      defaultValue: async () => getDefaultMediaId(PLATFORM_DEFAULT_MEDIA_SLOT),
      name: "logo",
      relationTo: "media",
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
          { type: "link", link: { label: "Blog", newTab: false, type: "custom", url: "/blog" } },
          { type: "link", link: { label: "Pricing", newTab: false, type: "custom", url: "#" } },
        ],
        es: [
          { type: "link", link: { label: "Blog", newTab: false, type: "custom", url: "/blog" } },
          { type: "link", link: { label: "Pricing", newTab: false, type: "custom", url: "#" } },
        ],
      }),
      fields: [
        {
          type: "row",
          fields: [
            {
              admin: { width: "60%" },
              label: { en: "Label", es: "Etiqueta" },
              localized: true,
              name: "label",
              required: true,
              type: "text",
            },
            {
              admin: { width: "40%" },
              defaultValue: "link",
              label: { en: "Type", es: "Tipo" },
              name: "type",
              options: [
                { label: { en: "Link", es: "Enlace" }, value: "link" },
                { label: { en: "Dropdown", es: "Desplegable" }, value: "dropdown" },
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
                  label: { en: "Enabled", es: "Habilitado" },
                  name: "enabled",
                  type: "checkbox",
                },
                {
                  type: "row",
                  admin: { condition: (_, siblingData) => !!siblingData?.enabled },
                  fields: [
                    {
                      admin: { width: "40%" },
                      label: { en: "Eyebrow", es: "Antetítulo" },
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
                  disableLabel: true,
                }),
              ],
              label: { en: "Menu links", es: "Enlaces del menú" },
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
      localized: true,
      maxRows: 6,
      name: "navItems",
      type: "array",
    },
    {
      admin: { initCollapsed: true },
      fields: (link() as GroupField).fields,
      label: { en: "Actions", es: "Acciones" },
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
      es: "Headers",
    },
    singular: {
      en: "Header",
      es: "Header",
    },
  },
  slug: "header",
  versions: {
    drafts: true,
    maxPerDoc: 50,
  },
};

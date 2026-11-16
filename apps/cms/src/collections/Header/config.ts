import { VISUAL_SECTIONS_GROUP } from "@/lib/config/adminGroups";
import type { CollectionConfig, Field, GroupField } from "payload";
import { entityHooks } from "@/collections/entities/shared";
import { siteHeaderFields } from "@/collections/siteChrome/fields";

import { PLATFORM_DEFAULT_MEDIA_SLOT } from "@/lib/constants/mediaDefaults";
import { anyone, or, user, superAdmin } from "@/lib/access";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { getDefaultMediaId } from "@/dal/getDefaultMediaId";
import { link } from "@/lib/fields/link";
import { rowTitle } from "@/blocks/site/shared";

import { revalidateResourcesUsingHeader } from "./hooks/revalidateResourcesUsingHeader";

const placedSiteFieldNames = new Set<string>();

const siteField = (name: string, width?: string): Field => {
  const field = siteHeaderFields.find(
    (candidate) => "name" in candidate && candidate.name === name
  );
  if (!field || !("name" in field)) {
    throw new Error(`The site header has no field named ${name}.`);
  }
  placedSiteFieldNames.add(name);
  return width ? ({ ...field, admin: { ...field.admin, width } } as Field) : field;
};

// Called after every siteField above, so a field added to the site header later still reaches the form instead of leaving the schema.
const unplacedSiteFields = (): Field[] =>
  siteHeaderFields.filter((field) => !("name" in field && placedSiteFieldNames.has(field.name)));

export const Header: CollectionConfig<"header"> = {
  access: {
    create: or(superAdmin, user),
    delete: or(superAdmin, user),
    read: anyone,
    update: or(superAdmin, user),
  },
  admin: {
    defaultColumns: ["name", "logo", "_status", "updatedAt"],
    group: VISUAL_SECTIONS_GROUP,
    listSearchableFields: ["name"],
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
      tabs: [
        {
          fields: [
            {
              admin: rowTitle("label", "Link"),
              defaultValue: createLocalizedDefault({
                en: [
                  {
                    type: "link",
                    link: { label: "Blog", newTab: false, type: "custom", url: "/blog" },
                  },
                  {
                    type: "link",
                    link: { label: "Pricing", newTab: false, type: "custom", url: "#" },
                  },
                ],
                es: [
                  {
                    type: "link",
                    link: { label: "Blog", newTab: false, type: "custom", url: "/blog" },
                  },
                  {
                    type: "link",
                    link: { label: "Pricing", newTab: false, type: "custom", url: "#" },
                  },
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
              admin: rowTitle("label", "Button"),
              fields: (link() as GroupField).fields,
              label: { en: "Actions", es: "Acciones" },
              localized: true,
              maxRows: 2,
              name: "actions",
              type: "array",
            },
            siteField("moreLinks"),
          ],
          label: { en: "Menu", es: "Menú" },
        },
        {
          fields: [
            siteField("announcement"),
            {
              fields: [siteField("phoneLabel", "50%"), siteField("phone", "50%")],
              type: "row",
            },
            siteField("locationsLabel"),
          ],
          label: { en: "Top bar and phone", es: "Barra superior y teléfono" },
        },
        {
          fields: [
            {
              fields: [
                {
                  admin: {
                    description: {
                      en: "The logo to display in the header",
                      es: "El logo a mostrar en el header",
                    },
                    width: "50%",
                  },
                  defaultValue: async () => getDefaultMediaId(PLATFORM_DEFAULT_MEDIA_SLOT),
                  name: "logo",
                  relationTo: "media",
                  required: true,
                  type: "upload",
                },
                siteField("mobileLogo", "50%"),
              ],
              type: "row",
            },
            ...unplacedSiteFields(),
          ],
          label: { en: "Logos", es: "Logotipos" },
        },
      ],
      type: "tabs",
    },
  ],
  hooks: {
    afterChange: [revalidateResourcesUsingHeader, ...(entityHooks?.afterChange ?? [])],
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

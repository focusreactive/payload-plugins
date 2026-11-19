import { VISUAL_SECTIONS_GROUP } from "@/lib/config/adminGroups";
import type { CollectionConfig, Field } from "payload";
import { entityHooks } from "@/collections/entities/shared";
import { siteFooterFields } from "@/collections/siteChrome/fields";

import { PLATFORM_DEFAULT_MEDIA_SLOT } from "@/lib/constants/mediaDefaults";
import { anyone, or, user, superAdmin } from "@/lib/access";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { getDefaultMediaId } from "@/dal/getDefaultMediaId";
import { link } from "@/lib/fields/link";
import { rowTitle } from "@/blocks/site/shared";
import {
  createLiveBeforeDocumentControls,
  createLivePreviewVersions,
} from "@/lib/config/livePreview";

import { revalidateResourcesUsingFooter } from "./hooks/revalidateResourcesUsingFooter";

const placedSiteFieldNames = new Set<string>();

const siteField = (name: string, width?: string): Field => {
  const field = siteFooterFields.find(
    (candidate) => "name" in candidate && candidate.name === name
  );
  if (!field || !("name" in field)) {
    throw new Error(`The site footer has no field named ${name}.`);
  }
  placedSiteFieldNames.add(name);
  return width ? ({ ...field, admin: { ...field.admin, width } } as Field) : field;
};

// Called after every siteField above, so a field added to the site footer later still reaches the form instead of leaving the schema.
const unplacedSiteFields = (): Field[] =>
  siteFooterFields.filter((field) => !("name" in field && placedSiteFieldNames.has(field.name)));

export const Footer: CollectionConfig<"footer"> = {
  access: {
    create: or(superAdmin, user),
    delete: or(superAdmin, user),
    read: anyone,
    update: or(superAdmin, user),
  },
  admin: {
    components: {
      edit: { beforeDocumentControls: createLiveBeforeDocumentControls() },
    },
    defaultColumns: ["name", "logo", "_status", "updatedAt"],
    group: VISUAL_SECTIONS_GROUP,
    listSearchableFields: ["name"],
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
      tabs: [
        {
          fields: [
            {
              admin: {
                ...rowTitle("label", "Group"),
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
                {
                  label: { en: "Group label", es: "Etiqueta del grupo" },
                  localized: true,
                  name: "label",
                  required: true,
                  type: "text",
                },
                {
                  admin: rowTitle("link.label", "Link"),
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
              admin: rowTitle("link.label", "Link"),
              fields: [link({ appearances: false })],
              label: { en: "Legal links", es: "Enlaces legales" },
              localized: true,
              maxRows: 4,
              name: "legalLinks",
              type: "array",
            },
            siteField("social"),
          ],
          label: { en: "Links", es: "Enlaces" },
        },
        {
          fields: [
            siteField("locationsHeading"),
            siteField("about"),
            siteField("disclaimer"),
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
              name: "copyrightText",
              type: "text",
            },
            {
              label: { en: "Description", es: "Descripción" },
              localized: true,
              name: "description",
              type: "text",
            },
          ],
          label: { en: "Text", es: "Texto" },
        },
        {
          fields: [siteField("newsletter")],
          label: { en: "Newsletter band", es: "Banda del boletín" },
        },
        {
          fields: [
            {
              fields: [
                {
                  admin: {
                    description: {
                      en: "The logo to display in the footer",
                      es: "El logo a mostrar en el footer",
                    },
                    width: "50%",
                  },
                  defaultValue: async () => getDefaultMediaId(PLATFORM_DEFAULT_MEDIA_SLOT),
                  name: "logo",
                  relationTo: "media",
                  required: true,
                  type: "upload",
                },
                siteField("phone", "50%"),
              ],
              type: "row",
            },
            ...unplacedSiteFields(),
          ],
          label: { en: "Logo and phone", es: "Logotipo y teléfono" },
        },
      ],
      type: "tabs",
    },
  ],
  hooks: {
    afterChange: [revalidateResourcesUsingFooter, ...(entityHooks?.afterChange ?? [])],
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
  versions: createLivePreviewVersions(),
};

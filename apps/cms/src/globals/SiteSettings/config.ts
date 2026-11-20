import type { GlobalConfig } from "payload";

import { DEFAULT_VALUES } from "@/lib/constants/defaultValues";
import { anyone, or, user, superAdmin } from "@/lib/access";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { generateSeoFields } from "@/lib/utils/seoFields";

import { revalidateSiteSettings } from "./hooks/revalidateSiteSettings";

export const SiteSettings: GlobalConfig = {
  access: {
    read: anyone,
    update: or(superAdmin, user),
  },
  admin: {
    group: "Settings",
  },
  fields: [
    {
      tabs: [
        {
          fields: [
            {
              name: "siteName",
              type: "text",
              defaultValue: createLocalizedDefault(
                DEFAULT_VALUES.collections.siteSettings.siteName
              ),
              localized: true,
            },
          ],
          label: {
            en: "General",
            es: "General",
          },
          name: "general",
        },
        {
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "logo",
                  type: "upload",
                  relationTo: "media",
                  label: {
                    en: "Admin Panel Logo",
                    es: "Logo del panel de administración",
                  },
                  admin: {
                    width: "50%",
                    description: {
                      en: "SVG or PNG, ~150×40px.",
                      es: "SVG o PNG, ~150×40px.",
                    },
                  },
                },
                {
                  name: "icon",
                  type: "upload",
                  relationTo: "media",
                  label: {
                    en: "Admin Panel Icon",
                    es: "Icono del panel de administración",
                  },
                  admin: {
                    width: "50%",
                    description: {
                      en: "Shown when the sidebar is collapsed. SVG or PNG, 32×32px.",
                      es: "Se muestra con la barra lateral colapsada. SVG o PNG, 32×32px.",
                    },
                  },
                },
              ],
            },
          ],
          label: {
            en: "Admin Panel",
            es: "Panel de administración",
          },
          name: "adminPanel",
        },
        {
          fields: [
            {
              type: "group",
              label: {
                en: "Title & Description",
                es: "Título y descripción",
              },
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      name: "titleSeparator",
                      type: "select",
                      label: {
                        en: "Title Separator",
                        es: "Separador de título",
                      },
                      defaultValue: "|",
                      options: [
                        { label: { en: "| (pipe)", es: "| (pipe)" }, value: "|" },
                        { label: { en: "- (dash)", es: "- (dash)" }, value: "-" },
                        { label: { en: "• (bullet)", es: "• (bullet)" }, value: "•" },
                      ],
                      admin: { width: "50%" },
                    },
                    {
                      name: "titleSuffix",
                      type: "text",
                      label: {
                        en: "Title Suffix",
                        es: "Sufijo de título",
                      },
                      admin: {
                        width: "50%",
                        placeholder: {
                          en: "Leave empty to use Site Name",
                          es: "Dejar vacío para usar el nombre del sitio",
                        },
                      },
                      localized: true,
                      defaultValue: createLocalizedDefault(
                        DEFAULT_VALUES.collections.siteSettings.seoTitleSuffix
                      ),
                    },
                  ],
                },
                {
                  name: "defaultDescription",
                  type: "textarea",
                  label: {
                    en: "Default Meta Description",
                    es: "Descripción de meta de respaldo",
                  },
                  defaultValue: createLocalizedDefault(
                    DEFAULT_VALUES.collections.siteSettings.defaultDescription
                  ),
                  localized: true,
                },
              ],
            },
            {
              name: "og",
              type: "group",
              label: {
                en: "Open Graph",
                es: "Open Graph",
              },
              fields: [
                {
                  name: "title",
                  type: "text",
                  label: {
                    en: "Default OG Title",
                    es: "Título de respaldo de Open Graph",
                  },
                  localized: true,
                },
                {
                  name: "description",
                  type: "textarea",
                  label: {
                    en: "Default OG Description",
                    es: "Descripción de respaldo de Open Graph",
                  },
                  admin: {
                    description: {
                      en: "Leave empty to use the default meta description.",
                      es: "Déjalo vacío para usar la descripción meta por defecto.",
                    },
                  },
                  localized: true,
                  defaultValue: createLocalizedDefault(
                    DEFAULT_VALUES.collections.siteSettings.defaultOgDescription
                  ),
                },
                {
                  name: "image",
                  type: "upload",
                  relationTo: "media",
                  label: {
                    en: "Default OG Image",
                    es: "Imagen de respaldo de Open Graph",
                  },
                },
              ],
            },
            {
              name: "x",
              type: "group",
              label: {
                en: "X (Twitter)",
                es: "X (Twitter)",
              },
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      name: "site",
                      type: "text",
                      label: {
                        en: "Twitter Site Handle",
                        es: "Handle de Twitter",
                      },
                      admin: {
                        width: "33%",
                        placeholder: {
                          en: "@yoursite",
                          es: "@yoursite",
                        },
                      },
                    },
                    {
                      name: "creator",
                      type: "text",
                      label: {
                        en: "Default Twitter Creator Handle",
                        es: "Handle de Twitter de respaldo",
                      },
                      admin: {
                        width: "33%",
                        placeholder: {
                          en: "@author",
                          es: "@author",
                        },
                      },
                    },
                    {
                      name: "card",
                      type: "select",
                      label: {
                        en: "Default Twitter Card Type",
                        es: "Tipo de tarjeta de Twitter de respaldo",
                      },
                      defaultValue: "summary_large_image",
                      options: [
                        {
                          label: {
                            en: "Summary Card with Large Image",
                            es: "Tarjeta de resumen con imagen grande",
                          },
                          value: "summary_large_image",
                        },
                        {
                          label: { en: "Summary Card", es: "Tarjeta de resumen" },
                          value: "summary",
                        },
                      ],
                      admin: { width: "34%" },
                    },
                  ],
                },
              ],
            },
          ],
          label: {
            en: "SEO Defaults",
            es: "Valores por defecto de SEO",
          },
          name: "seo",
        },
        {
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "header",
                  type: "relationship",
                  relationTo: "header",
                  admin: { width: "50%" },
                },
                {
                  name: "footer",
                  type: "relationship",
                  relationTo: "footer",
                  admin: { width: "50%" },
                },
              ],
            },
            {
              name: "title",
              type: "text",
              label: {
                en: "404 Title",
                es: "Título de la página 404",
              },
              localized: true,
              defaultValue: createLocalizedDefault(
                DEFAULT_VALUES.collections.siteSettings.notFoundTitle
              ),
            },
            {
              name: "description",
              type: "textarea",
              label: {
                en: "404 Description",
                es: "Descripción de la página 404",
              },
              defaultValue: createLocalizedDefault(
                DEFAULT_VALUES.collections.siteSettings.notFoundDescription
              ),
              localized: true,
            },
          ],
          label: {
            en: "404 Page",
            es: "Página 404",
          },
          name: "notFound",
        },
        {
          fields: [
            {
              type: "tabs",
              tabs: [
                {
                  label: { en: "Content", es: "Contenido" },
                  fields: [
                    {
                      type: "row",
                      fields: [
                        {
                          name: "header",
                          type: "relationship",
                          relationTo: "header",
                          admin: { width: "50%" },
                        },
                        {
                          name: "footer",
                          type: "relationship",
                          relationTo: "footer",
                          admin: { width: "50%" },
                        },
                      ],
                    },
                    {
                      type: "row",
                      fields: [
                        {
                          admin: { width: "40%" },
                          defaultValue: createLocalizedDefault({
                            en: "The Journal",
                            es: "The Journal",
                          }),
                          label: { en: "Eyebrow", es: "Antetítulo" },
                          localized: true,
                          name: "eyebrow",
                          type: "text",
                        },
                        {
                          admin: { width: "60%" },
                          name: "title",
                          type: "text",
                          required: true,
                          defaultValue: createLocalizedDefault(
                            DEFAULT_VALUES.collections.siteSettings.blog.blogTitle
                          ),
                          localized: true,
                          label: {
                            en: "Blog Page Title",
                            es: "Título de la página de blog",
                          },
                        },
                      ],
                    },
                    {
                      name: "description",
                      type: "textarea",
                      required: true,
                      localized: true,
                      label: {
                        en: "Blog Page Description",
                        es: "Descripción de la página de blog",
                      },
                      defaultValue: createLocalizedDefault(
                        DEFAULT_VALUES.collections.siteSettings.blog.blogDescription
                      ),
                    },
                    {
                      type: "row",
                      fields: [
                        {
                          admin: { width: "50%" },
                          defaultValue: createLocalizedDefault({
                            en: "Search articles…",
                            es: "Buscar artículos…",
                          }),
                          label: { en: "Search placeholder", es: "Marcador de búsqueda" },
                          localized: true,
                          name: "searchPlaceholder",
                          type: "text",
                        },
                        {
                          admin: { width: "50%" },
                          name: "readMoreLabel",
                          type: "text",
                          required: true,
                          label: {
                            en: "Read More Button Label",
                            es: "Etiqueta del botón Leer más",
                          },
                          localized: true,
                          defaultValue: createLocalizedDefault(
                            DEFAULT_VALUES.collections.siteSettings.blog.readMoreLabel
                          ),
                        },
                      ],
                    },
                    {
                      name: "relatedPostsLabel",
                      type: "text",
                      required: true,
                      label: {
                        en: "Related Posts Label",
                        es: "Etiqueta de publicaciones relacionadas",
                      },
                      localized: true,
                      defaultValue: createLocalizedDefault(
                        DEFAULT_VALUES.collections.siteSettings.blog.relatedPostsLabel
                      ),
                    },
                  ],
                },
                {
                  label: { en: "SEO", es: "SEO" },
                  fields: [
                    {
                      name: "meta",
                      type: "group",
                      label: false,
                      fields: generateSeoFields(),
                      localized: true,
                    },
                  ],
                },
              ],
            },
          ],
          label: {
            en: "Blog",
            es: "Blog",
          },
          name: "blog",
        },
      ],
      type: "tabs",
    },
  ],
  hooks: {
    afterChange: [revalidateSiteSettings],
  },
  label: {
    en: "Site Settings",
    es: "Configuración del sitio",
  },
  slug: "site-settings",
  versions: {
    drafts: true,
  },
};

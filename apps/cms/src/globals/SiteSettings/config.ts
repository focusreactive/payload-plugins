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
              label: { en: "Site name", es: "Nombre del sitio" },
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
            en: "Admin panel",
            es: "Panel de administración",
          },
          name: "adminPanel",
        },
        {
          fields: [
            {
              type: "group",
              label: {
                en: "Search results",
                es: "Resultados de búsqueda",
              },
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      name: "titleSeparator",
                      type: "select",
                      label: {
                        en: "Separator before the site name",
                        es: "Separador antes del nombre del sitio",
                      },
                      defaultValue: "|",
                      options: [
                        { label: { en: "| (vertical bar)", es: "| (barra vertical)" }, value: "|" },
                        { label: { en: "- (dash)", es: "- (guion)" }, value: "-" },
                        { label: { en: "• (dot)", es: "• (punto)" }, value: "•" },
                      ],
                      admin: { width: "50%" },
                    },
                    {
                      name: "titleSuffix",
                      type: "text",
                      label: {
                        en: "Site name after every page title",
                        es: "Nombre del sitio tras cada título",
                      },
                      admin: {
                        width: "50%",
                        placeholder: {
                          en: "Leave empty to use the site name",
                          es: "Déjalo vacío para usar el nombre del sitio",
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
                    en: "Default description in search results",
                    es: "Descripción por defecto en buscadores",
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
                en: "Social sharing",
                es: "Compartir en redes sociales",
              },
              fields: [
                {
                  name: "title",
                  type: "text",
                  label: {
                    en: "Default share title",
                    es: "Título por defecto al compartir",
                  },
                  localized: true,
                },
                {
                  name: "description",
                  type: "textarea",
                  label: {
                    en: "Default share description",
                    es: "Descripción por defecto al compartir",
                  },
                  admin: {
                    description: {
                      en: "Leave empty to reuse the default description in search results.",
                      es: "Déjalo vacío para reutilizar la descripción por defecto en buscadores.",
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
                    en: "Default share image",
                    es: "Imagen por defecto al compartir",
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
                        en: "Company account on X",
                        es: "Cuenta de la empresa en X",
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
                        en: "Default author account on X",
                        es: "Cuenta de autor por defecto en X",
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
                        en: "Link preview on X",
                        es: "Vista previa del enlace en X",
                      },
                      defaultValue: "summary_large_image",
                      options: [
                        {
                          label: {
                            en: "Large image",
                            es: "Imagen grande",
                          },
                          value: "summary_large_image",
                        },
                        {
                          label: { en: "Small image", es: "Imagen pequeña" },
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
            en: "Search and sharing",
            es: "Buscadores y redes sociales",
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
                en: "Title",
                es: "Título",
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
                en: "Text",
                es: "Texto",
              },
              defaultValue: createLocalizedDefault(
                DEFAULT_VALUES.collections.siteSettings.notFoundDescription
              ),
              localized: true,
            },
          ],
          label: {
            en: "Page not found",
            es: "Página no encontrada",
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
                          label: { en: "Label above title", es: "Texto sobre el título" },
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
                            en: "Blog title",
                            es: "Título del blog",
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
                        en: "Blog introduction",
                        es: "Introducción del blog",
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
                          label: {
                            en: "Hint inside the search box",
                            es: "Texto de ayuda del buscador",
                          },
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
                            en: "“Read more” button text",
                            es: "Texto del botón “Leer más”",
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
                        en: "“Related posts” heading",
                        es: "Título de “Publicaciones relacionadas”",
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

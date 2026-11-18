import type { CollectionConfig } from "payload";

import { bilingual } from "@/blocks/site/shared/fieldText";
import { bodyRichText } from "@/lib/fields/site/richText";

import {
  entityAccess,
  entityAdmin,
  entityHooks,
  entitySectionsField,
  entitySeoTab,
  entitySlugField,
  entityVersions,
} from "./shared";

export const Treatments: CollectionConfig<"treatments"> = {
  access: entityAccess,
  admin: entityAdmin({
    collection: "treatments",
    defaultColumns: ["title", "conditions", "_status", "updatedAt"],
    listSearchableFields: ["title", "summary"],
    useAsTitle: "title",
  }),
  fields: [
    {
      tabs: [
        {
          fields: [
            {
              admin: {
                description: {
                  en: "The treatment's name, for example Sclerotherapy. Cards, lists and the search trail show it.",
                  es: "El nombre del tratamiento, por ejemplo Escleroterapia. Lo muestran las tarjetas, las listas y la ruta para buscadores.",
                },
              },
              label: { en: "Name", es: "Nombre" },
              localized: true,
              name: "title",
              required: true,
              type: "text",
            },
            {
              admin: { initCollapsed: true },
              fields: [
                {
                  admin: {
                    description: {
                      en: "The big heading at the top of the treatment's page. Empty uses the name.",
                      es: "El encabezado grande de la página del tratamiento. Vacío usa el nombre.",
                    },
                  },
                  label: { en: "Page heading", es: "Encabezado de la página" },
                  localized: true,
                  name: "heroTitle",
                  type: "text",
                },
                bilingual(
                  bodyRichText({
                    description: "The paragraphs under the page heading.",
                    label: "Introduction",
                    localized: true,
                    name: "heroIntro",
                  }),
                  { en: "Introduction", es: "Introducción" },
                  {
                    en: "The paragraphs under the page heading, beside the top picture.",
                    es: "Los párrafos bajo el encabezado, junto a la imagen superior.",
                  }
                ),
                {
                  admin: {
                    description: {
                      en: "The picture beside the heading at the top of the treatment's page.",
                      es: "La imagen junto al encabezado, arriba en la página del tratamiento.",
                    },
                  },
                  label: { en: "Top picture", es: "Imagen superior" },
                  name: "heroImage",
                  relationTo: "media",
                  type: "upload",
                },
              ],
              label: { en: "Hero", es: "Cabecera" },
              type: "collapsible",
            },
            {
              admin: { initCollapsed: true },
              fields: [
                {
                  fields: [
                    {
                      admin: {
                        description: {
                          en: "One line under the name on treatment cards, for example A vein treatment using an injectable medicine.",
                          es: "Una línea bajo el nombre en las tarjetas, por ejemplo Un tratamiento de venas con un medicamento inyectable.",
                        },
                        width: "50%",
                      },
                      label: { en: "Card text", es: "Texto de la tarjeta" },
                      localized: true,
                      name: "summary",
                      type: "text",
                    },
                    {
                      admin: {
                        description: {
                          en: "The picture on the treatment's card in sliders and lists.",
                          es: "La imagen de la tarjeta del tratamiento en carruseles y listas.",
                        },
                        width: "50%",
                      },
                      label: { en: "Card image", es: "Imagen de la tarjeta" },
                      name: "cardImage",
                      relationTo: "media",
                      type: "upload",
                    },
                  ],
                  type: "row",
                },
              ],
              label: { en: "Card in lists", es: "Tarjeta en listas" },
              type: "collapsible",
            },
            entitySectionsField(
              "The sections of the treatment's page under its heading, top to bottom. A conditions grid with no conditions picked shows the ones set under Treats."
            ),
          ],
          label: { en: "Content", es: "Contenido" },
        },
        entitySeoTab,
      ],
      type: "tabs",
    },
    entitySlugField("The last part of the treatment page's URL, for example sclerotherapy."),
    {
      admin: {
        description: {
          en: "The conditions this treatment helps, in the order its page lists them.",
          es: "Las afecciones que trata este tratamiento, en el orden en que las muestra su página.",
        },
        position: "sidebar",
      },
      hasMany: true,
      label: { en: "Treats", es: "Trata" },
      name: "conditions",
      relationTo: "conditions",
      type: "relationship",
    },
    {
      admin: {
        description: {
          en: "Lower numbers come first in treatment lists and sliders.",
          es: "Los números más bajos aparecen primero en listas y carruseles.",
        },
        position: "sidebar",
      },
      defaultValue: 100,
      label: { en: "Order in the list", es: "Orden en la lista" },
      name: "listOrder",
      type: "number",
    },
  ],
  hooks: entityHooks,
  labels: {
    plural: { en: "Treatments", es: "Tratamientos" },
    singular: { en: "Treatment", es: "Tratamiento" },
  },
  slug: "treatments",
  versions: entityVersions,
};

import type { CollectionConfig } from "payload";

import {
  entityAccess,
  entityAdmin,
  entityHooks,
  entitySectionsField,
  entitySeoTab,
  entitySlugField,
  entityVersions,
} from "./shared";

export const Conditions: CollectionConfig<"conditions"> = {
  access: entityAccess,
  admin: entityAdmin({
    collection: "conditions",
    defaultColumns: ["title", "_status", "updatedAt"],
    useAsTitle: "title",
  }),
  fields: [
    {
      tabs: [
        {
          fields: [
            {
              fields: [
                {
                  admin: {
                    description: {
                      en: "The condition's name in every list of conditions, for example Spider Veins.",
                      es: "El nombre de la condición en todas las listas de condiciones, por ejemplo Arañas vasculares.",
                    },
                    width: "50%",
                  },
                  label: { en: "Name", es: "Nombre" },
                  localized: true,
                  name: "title",
                  required: true,
                  type: "text",
                },
                {
                  admin: {
                    description: {
                      en: "The round drawing shown wherever conditions are listed. An SVG file is drawn into the page, so the menu at the top of condition pages can recolour it.",
                      es: "El dibujo redondo que aparece donde se listan las condiciones. Un archivo SVG se dibuja dentro de la página, para que el menú superior de las páginas de condiciones pueda cambiar su color.",
                    },
                    width: "50%",
                  },
                  label: { en: "Icon", es: "Icono" },
                  name: "icon",
                  relationTo: "media",
                  type: "upload",
                },
              ],
              type: "row",
            },
            {
              admin: {
                description: {
                  en: "The band at the top of the condition's page: a heading over a row of every condition, on a picture.",
                  es: "La franja superior de la página de la condición: un título sobre una fila con todas las condiciones, sobre una imagen.",
                },
                initCollapsed: true,
              },
              fields: [
                {
                  fields: [
                    {
                      admin: {
                        description: {
                          en: "The start of the heading, for example Explore the Symptoms of.",
                          es: "El comienzo del título, por ejemplo Explore los síntomas de la.",
                        },
                        width: "50%",
                      },
                      label: { en: "Heading", es: "Título" },
                      localized: true,
                      name: "navHeading",
                      type: "text",
                    },
                    {
                      admin: {
                        description: {
                          en: "The end of the heading, on its own line on phones, for example Vein Disease.",
                          es: "El final del título, en su propia línea en teléfonos, por ejemplo Enfermedad de las Venas.",
                        },
                        width: "50%",
                      },
                      label: { en: "Heading end", es: "Final del título" },
                      localized: true,
                      name: "navHeadingEnd",
                      type: "text",
                    },
                  ],
                  type: "row",
                },
                {
                  fields: [
                    {
                      admin: {
                        description: {
                          en: "The wide picture behind the band on computers.",
                          es: "La imagen ancha detrás de la franja en ordenadores.",
                        },
                        width: "50%",
                      },
                      label: { en: "Picture", es: "Imagen" },
                      name: "heroImage",
                      relationTo: "media",
                      type: "upload",
                    },
                    {
                      admin: {
                        description: {
                          en: "The picture behind the band on phones. Empty uses the picture for computers.",
                          es: "La imagen detrás de la franja en teléfonos. Vacío usa la imagen para ordenadores.",
                        },
                        width: "50%",
                      },
                      label: {
                        en: "Picture on phones",
                        es: "Imagen en teléfonos",
                      },
                      name: "heroMobileImage",
                      relationTo: "media",
                      type: "upload",
                    },
                  ],
                  type: "row",
                },
                {
                  admin: {
                    description: {
                      en: "The heading of the conditions menu that appears once the visitor scrolls past the band, for example Explore More Symptoms.",
                      es: "El título del menú de condiciones que aparece cuando el visitante pasa la franja, por ejemplo Explore más síntomas.",
                    },
                  },
                  label: { en: "Menu heading", es: "Título del menú" },
                  localized: true,
                  name: "menuHeading",
                  type: "text",
                },
              ],
              label: { en: "Hero", es: "Cabecera" },
              type: "collapsible",
            },
            entitySectionsField(
              "The sections of the condition's page under the top band, top to bottom. The first section opens with the page's main heading."
            ),
          ],
          label: { en: "Content", es: "Contenido" },
        },
        {
          fields: [
            {
              admin: {
                allowCreate: false,
                description: {
                  en: "Every treatment whose Treats list includes this condition. Change it by editing the treatment.",
                  es: "Cada tratamiento cuya lista Trata incluye esta condición. Se cambia editando el tratamiento.",
                },
              },
              collection: "treatments",
              label: {
                en: "Treatments for this condition",
                es: "Tratamientos para esta condición",
              },
              name: "treatments",
              on: "conditions",
              type: "join",
            },
          ],
          label: { en: "Treatments", es: "Tratamientos" },
        },
        entitySeoTab,
      ],
      type: "tabs",
    },
    entitySlugField("The last part of the condition page's URL, for example spider-veins."),
    {
      admin: {
        description: {
          en: "Lower numbers come first in condition lists and in the menu at the top of condition pages.",
          es: "Los números más bajos van primero en las listas de condiciones y en el menú superior de las páginas de condiciones.",
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
    plural: { en: "Conditions", es: "Condiciones" },
    singular: { en: "Condition", es: "Condición" },
  },
  slug: "conditions",
  versions: entityVersions,
};

import type { CollectionConfig, Field } from "payload";

import { bilingual } from "@/blocks/site/shared/fieldText";
import { bodyRichText, headingRichText } from "@/lib/fields/site/richText";
import { siteButton } from "@/lib/fields/site/siteLink";

import {
  entityAccess,
  entityAdmin,
  entityHooks,
  entitySectionsField,
  entitySeoTab,
  entitySlugField,
  entityVersions,
  ratingFields,
} from "./shared";

export const States: CollectionConfig<"states"> = {
  access: entityAccess,
  admin: entityAdmin({
    collection: "states",
    defaultColumns: ["name", "abbreviation", "slug", "updatedAt"],
    useAsTitle: "name",
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
                      en: "The state's name as visitors read it in this language, for example Texas or Nueva York.",
                      es: "El nombre del estado tal como lo leen los visitantes en este idioma, por ejemplo Texas o Nueva York.",
                    },
                    width: "70%",
                  },
                  label: { en: "Name", es: "Nombre" },
                  localized: true,
                  name: "name",
                  required: true,
                  type: "text",
                },
                {
                  admin: {
                    description: {
                      en: "Two letters, used in addresses and the map, for example TX.",
                      es: "Dos letras, usadas en direcciones y en el mapa, por ejemplo TX.",
                    },
                    width: "30%",
                  },
                  label: { en: "Abbreviation", es: "Abreviatura" },
                  maxLength: 2,
                  name: "abbreviation",
                  type: "text",
                },
              ],
              type: "row",
            },
            bilingual(
              headingRichText({
                description: "The large line at the top of the page.",
                label: "Tagline",
                localized: true,
                name: "heroTagline",
              }),
              { en: "Tagline", es: "Lema" },
              {
                en: "The large line at the top of the page, for example Texas, Meet Healthy Legs. Set words in italics to put them on their own underlined line. Empty hides it.",
                es: "La línea grande en la parte superior de la página, por ejemplo Texas, Meet Healthy Legs. Ponga palabras en cursiva para mostrarlas en su propia línea subrayada. Vacío la oculta.",
              }
            ),
            bilingual(
              { ...siteButton({ name: "heroButton" }), localized: true } as Field,
              { en: "Top button", es: "Botón superior" },
              {
                en: "The button under the tagline. Empty text hides it.",
                es: "El botón bajo el lema. Sin texto se oculta.",
              }
            ),
            {
              admin: {
                description: {
                  en: "The heading under the tagline. Empty uses the state's name.",
                  es: "El encabezado bajo el lema. Vacío usa el nombre del estado.",
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
                en: "The paragraphs under the page heading. Links to pages are allowed.",
                es: "Los párrafos bajo el encabezado de la página. Admite enlaces a páginas.",
              }
            ),
            {
              fields: [
                {
                  admin: {
                    description: {
                      en: "The wide picture behind the top of the page on computers.",
                      es: "La imagen ancha detrás de la parte superior de la página en ordenadores.",
                    },
                    width: "50%",
                  },
                  label: { en: "Top image", es: "Imagen superior" },
                  name: "heroImage",
                  relationTo: "media",
                  type: "upload",
                },
                {
                  admin: {
                    description: {
                      en: "The same picture cut for phones. Empty uses the top image.",
                      es: "La misma imagen recortada para móviles. Vacío usa la imagen superior.",
                    },
                    width: "50%",
                  },
                  label: { en: "Top image on phones", es: "Imagen superior en móviles" },
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
                  en: "The round badge beside the heading, for example a satisfaction score. Each language can have its own. Empty hides it.",
                  es: "La insignia redonda junto al encabezado, por ejemplo una puntuación de satisfacción. Cada idioma puede tener la suya. Vacío la oculta.",
                },
              },
              label: { en: "Badge", es: "Insignia" },
              localized: true,
              name: "heroBadge",
              relationTo: "media",
              type: "upload",
            },
            {
              admin: {
                description: {
                  en: "The number visitors call for clinics in this state, for example 888-555-0100.",
                  es: "El número al que llaman los visitantes para las clínicas de este estado, por ejemplo 888-555-0100.",
                },
              },
              label: { en: "Phone", es: "Teléfono" },
              name: "phone",
              type: "text",
            },
            ratingFields,
            {
              admin: {
                allowCreate: false,
                description: {
                  en: "Every clinic whose State is this one. Add a clinic to the state by editing the clinic.",
                  es: "Cada clínica cuyo Estado es este. Añada una clínica al estado editando la clínica.",
                },
              },
              collection: "clinics",
              label: { en: "Clinics in this state", es: "Clínicas en este estado" },
              name: "clinics",
              on: "state",
              type: "join",
            },
            entitySectionsField(
              "The sections of the state's page under its heading, top to bottom."
            ),
          ],
          label: { en: "Content", es: "Contenido" },
        },
        entitySeoTab,
      ],
      type: "tabs",
    },
    entitySlugField("The last part of the state page's URL, for example new-york."),
  ],
  hooks: entityHooks,
  labels: {
    plural: { en: "States", es: "Estados" },
    singular: { en: "State", es: "Estado" },
  },
  slug: "states",
  versions: entityVersions,
};

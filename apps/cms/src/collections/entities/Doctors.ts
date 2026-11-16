import type { CollectionConfig } from "payload";

import { rowTitle } from "@/blocks/site/shared";
import { bilingual } from "@/blocks/site/shared/fieldText";

import {
  entityAccess,
  entityAdmin,
  entityHooks,
  entitySectionsField,
  entitySeoTab,
  entitySlugField,
  entityVersions,
} from "./shared";

export const Doctors: CollectionConfig<"doctors"> = {
  access: entityAccess,
  admin: entityAdmin({
    collection: "doctors",
    defaultColumns: ["name", "jobTitle", "clinics", "_status", "updatedAt"],
    listSearchableFields: ["name", "jobTitle"],
    useAsTitle: "name",
  }),
  fields: [
    {
      tabs: [
        {
          fields: [
            {
              admin: {
                description: {
                  en: "The doctor's name as visitors read it, for example Dr. Jane Smith. Spanish pages may use Dra.",
                  es: "El nombre del médico tal como lo leen los visitantes, por ejemplo Dra. Jane Smith.",
                },
              },
              label: { en: "Name", es: "Nombre" },
              localized: true,
              name: "name",
              required: true,
              type: "text",
            },
            {
              fields: [
                {
                  admin: {
                    description: {
                      en: "The line under the doctor's name, for example Board-Certified Physician and Vein Specialist.",
                      es: "La línea bajo el nombre del médico, por ejemplo Médica certificada y especialista en venas.",
                    },
                    width: "65%",
                  },
                  label: { en: "Job title", es: "Cargo" },
                  localized: true,
                  name: "jobTitle",
                  type: "text",
                },
                {
                  admin: {
                    description: {
                      en: "A short badge over the doctor's name and photo, for example Chief Medical Officer. Empty shows no badge.",
                      es: "Una etiqueta corta sobre el nombre y la foto del médico, por ejemplo Director Médico. Vacío no muestra etiqueta.",
                    },
                    width: "35%",
                  },
                  label: { en: "Badge", es: "Etiqueta" },
                  localized: true,
                  name: "featuredLabel",
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
                      en: "The round photo on the doctor's page on phones, and on cards, sliders, quotes and article bylines.",
                      es: "La foto redonda de la página del médico en el móvil, y de tarjetas, carruseles, citas y firmas de artículos.",
                    },
                    width: "50%",
                  },
                  label: { en: "Photo", es: "Foto" },
                  name: "photo",
                  relationTo: "media",
                  type: "upload",
                },
                {
                  admin: {
                    description: {
                      en: "The wide picture behind the top of the doctor's page on larger screens, with the doctor on the right. Empty shows the plain coloured band.",
                      es: "La imagen ancha detrás de la parte superior de la página en pantallas grandes, con el médico a la derecha. Vacío muestra la franja de color.",
                    },
                    width: "50%",
                  },
                  label: { en: "Top image", es: "Imagen superior" },
                  name: "heroImage",
                  relationTo: "media",
                  type: "upload",
                },
              ],
              type: "row",
            },
            bilingual(
              entitySectionsField("The sections of the doctor's page under its top section."),
              { en: "Sections", es: "Secciones" },
              {
                en: "The sections of the doctor's page under its top section, top to bottom: biography, quote, reviews and more.",
                es: "Las secciones de la página del médico bajo su parte superior, de arriba abajo: biografía, cita, reseñas y más.",
              }
            ),
          ],
          label: { en: "Content", es: "Contenido" },
        },
        {
          fields: [
            {
              fields: [
                {
                  admin: {
                    description: {
                      en: "Letters after the name, one per entry, for example MD or FACS. Sent to search engines.",
                      es: "Siglas tras el nombre, una por entrada, por ejemplo MD o FACS. Se envían a los buscadores.",
                    },
                    width: "33%",
                  },
                  hasMany: true,
                  label: { en: "Credentials", es: "Titulaciones" },
                  name: "credentials",
                  type: "text",
                },
                {
                  admin: {
                    description: {
                      en: "Languages the doctor speaks with patients, one per entry, for example Spanish. Sent to search engines.",
                      es: "Idiomas en que el médico atiende a los pacientes, uno por entrada, por ejemplo Spanish. Se envían a los buscadores.",
                    },
                    width: "33%",
                  },
                  hasMany: true,
                  label: { en: "Languages", es: "Idiomas" },
                  name: "languages",
                  type: "text",
                },
                {
                  admin: {
                    description: {
                      en: "What the doctor treats, one per entry, for example Sclerotherapy. Sent to search engines.",
                      es: "Lo que trata el médico, uno por entrada, por ejemplo Sclerotherapy. Se envía a los buscadores.",
                    },
                    width: "34%",
                  },
                  hasMany: true,
                  label: { en: "Specialties", es: "Especialidades" },
                  name: "specialties",
                  type: "text",
                },
              ],
              type: "row",
            },
            {
              admin: {
                ...rowTitle("name", "Institution"),
                description: {
                  en: "Schools, residencies and fellowships. Sent to search engines.",
                  es: "Universidades, residencias y fellowships. Se envían a los buscadores.",
                },
              },
              fields: [
                {
                  fields: [
                    {
                      admin: {
                        description: {
                          en: "For example Des Moines University.",
                          es: "Por ejemplo Des Moines University.",
                        },
                        width: "65%",
                      },
                      label: { en: "Institution", es: "Institución" },
                      name: "name",
                      required: true,
                      type: "text",
                    },
                    {
                      admin: {
                        description: {
                          en: "Where the doctor trained.",
                          es: "Dónde se formó el médico.",
                        },
                        width: "35%",
                      },
                      defaultValue: "school",
                      label: { en: "Kind", es: "Tipo" },
                      name: "kind",
                      options: [
                        {
                          label: { en: "College or university", es: "Facultad o universidad" },
                          value: "school",
                        },
                        { label: { en: "Hospital", es: "Hospital" }, value: "hospital" },
                      ],
                      type: "select",
                    },
                  ],
                  type: "row",
                },
              ],
              label: { en: "Training", es: "Formación" },
              labels: {
                plural: { en: "Institutions", es: "Instituciones" },
                singular: { en: "Institution", es: "Institución" },
              },
              name: "education",
              type: "array",
            },
            {
              fields: [
                {
                  admin: {
                    description: {
                      en: "The doctor's National Provider Identifier, sent to search engines, for example 1982286456.",
                      es: "El National Provider Identifier del médico, que se envía a los buscadores, por ejemplo 1982286456.",
                    },
                    width: "30%",
                  },
                  label: { en: "NPI number", es: "Número NPI" },
                  name: "npi",
                  type: "text",
                },
                {
                  admin: {
                    description: {
                      en: "The doctor's profiles on other websites, full URLs, one per entry, for example https://www.healthgrades.com/physician/dr-jane-smith. Sent to search engines.",
                      es: "Los perfiles del médico en otros sitios web, URL completas, una por entrada, por ejemplo https://www.healthgrades.com/physician/dr-jane-smith. Se envían a los buscadores.",
                    },
                    width: "70%",
                  },
                  hasMany: true,
                  label: { en: "Profile URLs", es: "URL de perfiles" },
                  name: "profiles",
                  type: "text",
                },
              ],
              type: "row",
            },
          ],
          label: { en: "Credentials", es: "Credenciales" },
        },
        entitySeoTab,
      ],
      type: "tabs",
    },
    bilingual(
      entitySlugField("The last part of the doctor page's URL, for example dr-jane-smith."),
      { en: "Slug", es: "Slug" },
      {
        en: "The last part of the doctor page's URL, for example dr-jane-smith.",
        es: "La última parte de la URL de la página del médico, por ejemplo dr-jane-smith.",
      }
    ),
    {
      admin: {
        description: {
          en: "The clinics this doctor works at, in the order shown. The doctor's page links them, and each clinic's page and its state's page list the doctor.",
          es: "Las clínicas donde trabaja el médico, en el orden mostrado. La página del médico las enlaza, y la página de cada clínica y de su estado lista al médico.",
        },
        position: "sidebar",
      },
      hasMany: true,
      label: { en: "Clinics", es: "Clínicas" },
      name: "clinics",
      relationTo: "clinics",
      type: "relationship",
    },
  ],
  hooks: entityHooks,
  labels: {
    plural: { en: "Doctors", es: "Médicos" },
    singular: { en: "Doctor", es: "Médico" },
  },
  slug: "doctors",
  versions: entityVersions,
};

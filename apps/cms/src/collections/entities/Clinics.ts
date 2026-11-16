import type { CollectionConfig, PayloadRequest, TextFieldSingleValidation } from "payload";

import { rowTitle } from "@/blocks/site/shared";
import { bilingual } from "@/blocks/site/shared/fieldText";
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

const resolveStateSlug = async (
  data: Record<string, unknown> | undefined,
  req: PayloadRequest
): Promise<string | null> => {
  const state = data?.state;

  if (!state) {
    return null;
  }

  if (typeof state === "object" && "slug" in state && typeof state.slug === "string") {
    return state.slug;
  }

  if (typeof state !== "number" && typeof state !== "string") {
    return null;
  }

  const stateDoc = await req.payload
    .findByID({ collection: "states", depth: 0, draft: true, id: state, req })
    .catch(() => null);

  return stateDoc?.slug ?? null;
};

export const WEEK_DAYS = [
  { label: { en: "Monday", es: "Lunes" }, value: "monday" },
  { label: { en: "Tuesday", es: "Martes" }, value: "tuesday" },
  { label: { en: "Wednesday", es: "Miércoles" }, value: "wednesday" },
  { label: { en: "Thursday", es: "Jueves" }, value: "thursday" },
  { label: { en: "Friday", es: "Viernes" }, value: "friday" },
  { label: { en: "Saturday", es: "Sábado" }, value: "saturday" },
  { label: { en: "Sunday", es: "Domingo" }, value: "sunday" },
] as const;

export type WeekDay = (typeof WEEK_DAYS)[number]["value"];

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/u;

const validateTime: TextFieldSingleValidation = (value) =>
  !value || timePattern.test(value.trim()) ? true : "Use 24-hour time, for example 08:00 or 19:30.";

export const Clinics: CollectionConfig<"clinics"> = {
  access: entityAccess,
  admin: entityAdmin({
    collection: "clinics",
    defaultColumns: ["name", "state", "phone", "updatedAt"],
    resolveStateSlug,
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
                  en: "The clinic's short name, shown in lists, the footer, breadcrumbs and under each review, for example Downtown.",
                  es: "El nombre corto de la clínica, en listas, el pie de página, las migas de pan y bajo cada reseña, por ejemplo Downtown.",
                },
              },
              label: { en: "Name", es: "Nombre" },
              name: "name",
              required: true,
              type: "text",
            },
            {
              admin: {
                description: {
                  en: "The big heading at the top of the clinic's page. Empty uses the clinic's name.",
                  es: "El encabezado grande en la parte superior de la página de la clínica. Vacío usa el nombre de la clínica.",
                },
              },
              label: { en: "Page heading", es: "Encabezado de la página" },
              localized: true,
              name: "heroTitle",
              type: "text",
            },
            {
              admin: {
                description: {
                  en: "The smaller line under the page heading. Empty hides it.",
                  es: "La línea más pequeña bajo el encabezado de la página. Vacío la oculta.",
                },
              },
              label: { en: "Page subheading", es: "Subtítulo de la página" },
              localized: true,
              name: "heroSubtitle",
              type: "text",
            },
            {
              admin: {
                description: {
                  en: "The words and the button at the top of the clinic's page, around the address and the phone number, which come from Clinic details.",
                  es: "Los textos y el botón en la parte superior de la página de la clínica, alrededor de la dirección y el teléfono, que vienen de Datos de la clínica.",
                },
                hideGutter: true,
              },
              fields: [
                {
                  admin: {
                    description: {
                      en: "The first step of the trail above the heading, which links to the locations page, for example Locations.",
                      es: "El primer paso de la ruta sobre el encabezado, que enlaza a la página de ubicaciones, por ejemplo Ubicaciones.",
                    },
                  },
                  label: { en: "Locations step text", es: "Texto del paso Ubicaciones" },
                  name: "crumb",
                  type: "text",
                },
                bilingual(
                  siteButton(),
                  { en: "Button", es: "Botón" },
                  {
                    en: "The button under the address, for example Book Your Free Evaluation. Empty text hides it.",
                    es: "El botón bajo la dirección, por ejemplo Programe su evaluación gratuita. Sin texto no se muestra.",
                  }
                ),
                {
                  admin: {
                    description: {
                      en: "The words before the clinic's phone number, for example Or Call:.",
                      es: "El texto antes del teléfono de la clínica, por ejemplo O llame al:.",
                    },
                  },
                  label: { en: "Phone line text", es: "Texto de la línea del teléfono" },
                  name: "phoneLabel",
                  type: "text",
                },
              ],
              label: { en: "Page top", es: "Parte superior de la página" },
              localized: true,
              name: "hero",
              type: "group",
            },
            {
              admin: {
                description: {
                  en: "A paragraph about this clinic, sent to search engines with the page.",
                  es: "Un párrafo sobre esta clínica, que se envía a los buscadores con la página.",
                },
              },
              label: { en: "About this clinic", es: "Sobre esta clínica" },
              localized: true,
              name: "description",
              type: "textarea",
            },
            {
              admin: {
                description: {
                  en: "Neighbourhoods and towns this clinic serves, one per entry, for example Plano. Shown under Located Near on the clinic's page.",
                  es: "Barrios y ciudades que atiende esta clínica, uno por entrada, por ejemplo Plano. Se muestran en Ubicado cerca de en la página de la clínica.",
                },
              },
              hasMany: true,
              label: { en: "Located near", es: "Ubicado cerca de" },
              localized: true,
              name: "locatedNear",
              type: "text",
            },
            {
              admin: {
                description: {
                  en: "The photo at the top of the clinic's page and on its cards.",
                  es: "La foto en la parte superior de la página de la clínica y en sus tarjetas.",
                },
              },
              label: { en: "Photo", es: "Foto" },
              name: "photo",
              relationTo: "media",
              type: "upload",
            },
            bilingual(
              entitySectionsField(
                "The sections of the clinic's page under its heading, top to bottom."
              ),
              { en: "Sections", es: "Secciones" },
              {
                en: "The sections of the clinic's page under its heading, top to bottom.",
                es: "Las secciones de la página de la clínica bajo su encabezado, de arriba abajo.",
              }
            ),
          ],
          label: { en: "Content", es: "Contenido" },
        },
        {
          fields: [
            {
              admin: {
                description: {
                  en: "The clinic's own phone number, for example 469-555-0100.",
                  es: "El teléfono propio de la clínica, por ejemplo 469-555-0100.",
                },
              },
              label: { en: "Phone", es: "Teléfono" },
              name: "phone",
              type: "text",
            },
            {
              admin: {
                description: {
                  en: "Shown at the top of the clinic's page, on its state's page and sent to search engines.",
                  es: "Se muestra en la parte superior de la página de la clínica, en la página de su estado y se envía a los buscadores.",
                },
                hideGutter: true,
              },
              fields: [
                {
                  admin: {
                    description: {
                      en: "Street and suite, for example 1105 Central Expy N, Suite 2240.",
                      es: "Calle y local, por ejemplo 1105 Central Expy N, Suite 2240.",
                    },
                  },
                  label: { en: "Street", es: "Calle" },
                  name: "street",
                  type: "text",
                },
                {
                  fields: [
                    {
                      admin: {
                        description: { en: "For example Allen.", es: "Por ejemplo Allen." },
                        width: "50%",
                      },
                      label: { en: "City", es: "Ciudad" },
                      name: "city",
                      type: "text",
                    },
                    {
                      admin: {
                        description: {
                          en: "Two letters, for example TX.",
                          es: "Dos letras, por ejemplo TX.",
                        },
                        width: "20%",
                      },
                      label: { en: "State code", es: "Código del estado" },
                      maxLength: 2,
                      name: "region",
                      type: "text",
                    },
                    {
                      admin: {
                        description: { en: "For example 75013.", es: "Por ejemplo 75013." },
                        width: "30%",
                      },
                      label: { en: "ZIP code", es: "Código postal" },
                      name: "postalCode",
                      type: "text",
                    },
                  ],
                  type: "row",
                },
              ],
              label: { en: "Address", es: "Dirección" },
              name: "address",
              type: "group",
            },
            {
              admin: {
                description: {
                  en: "The Google Maps link that directions open, for example https://maps.app.goo.gl/abc. Also sent to search engines.",
                  es: "El enlace de Google Maps que abren las indicaciones, por ejemplo https://maps.app.goo.gl/abc. También se envía a los buscadores.",
                },
              },
              label: { en: "Map URL", es: "URL del mapa" },
              name: "mapUrl",
              type: "text",
            },
            {
              admin: {
                description: {
                  en: "Where the pin sits on the map of the clinic's page. Copy both numbers from Google Maps. Empty places the pin by the address.",
                  es: "Dónde se coloca el marcador en el mapa de la página de la clínica. Copie ambos números de Google Maps. Vacío coloca el marcador por la dirección.",
                },
                hideGutter: true,
              },
              fields: [
                {
                  fields: [
                    {
                      admin: {
                        description: { en: "For example 33.1160.", es: "Por ejemplo 33.1160." },
                        width: "50%",
                      },
                      label: { en: "Latitude", es: "Latitud" },
                      name: "latitude",
                      type: "number",
                    },
                    {
                      admin: {
                        description: { en: "For example -96.6740.", es: "Por ejemplo -96.6740." },
                        width: "50%",
                      },
                      label: { en: "Longitude", es: "Longitud" },
                      name: "longitude",
                      type: "number",
                    },
                  ],
                  type: "row",
                },
              ],
              label: { en: "Map position", es: "Posición en el mapa" },
              name: "geo",
              type: "group",
            },
            {
              admin: {
                ...rowTitle("day", "Day"),
                description: {
                  en: "One row per day, Monday to Sunday. Change a row here and the clinic's page, its state's page and search engines all show the new hours. A day with no row shows as closed.",
                  es: "Una fila por día, de lunes a domingo. Cambie una fila aquí y la página de la clínica, la de su estado y los buscadores muestran el nuevo horario. Un día sin fila se muestra cerrado.",
                },
                initCollapsed: false,
              },
              fields: [
                {
                  fields: [
                    {
                      admin: {
                        description: { en: "The day of the week.", es: "El día de la semana." },
                        width: "34%",
                      },
                      label: { en: "Day", es: "Día" },
                      name: "day",
                      options: [...WEEK_DAYS],
                      required: true,
                      type: "select",
                    },
                    {
                      admin: {
                        condition: (_, siblingData) => !siblingData?.closed,
                        description: {
                          en: "24-hour time, for example 08:00.",
                          es: "Hora en formato 24 horas, por ejemplo 08:00.",
                        },
                        width: "22%",
                      },
                      label: { en: "Opens", es: "Abre" },
                      name: "opens",
                      type: "text",
                      validate: validateTime,
                    },
                    {
                      admin: {
                        condition: (_, siblingData) => !siblingData?.closed,
                        description: {
                          en: "24-hour time, for example 19:00.",
                          es: "Hora en formato 24 horas, por ejemplo 19:00.",
                        },
                        width: "22%",
                      },
                      label: { en: "Closes", es: "Cierra" },
                      name: "closes",
                      type: "text",
                      validate: validateTime,
                    },
                    {
                      admin: {
                        description: {
                          en: "Shows Closed for this day.",
                          es: "Muestra Cerrado para este día.",
                        },
                        style: { alignSelf: "center" },
                        width: "22%",
                      },
                      defaultValue: false,
                      label: { en: "Closed all day", es: "Cerrado todo el día" },
                      name: "closed",
                      type: "checkbox",
                    },
                  ],
                  type: "row",
                },
              ],
              label: { en: "Opening hours", es: "Horario de apertura" },
              labels: {
                plural: { en: "Days", es: "Días" },
                singular: { en: "Day", es: "Día" },
              },
              maxRows: 7,
              name: "hours",
              type: "array",
            },
            bilingual(
              ratingFields,
              { en: "Reviews rating", es: "Valoración de las reseñas" },
              {
                en: "Shown next to the stars and sent to search engines with the page.",
                es: "Se muestra junto a las estrellas y se envía a los buscadores con la página.",
              }
            ),
            {
              admin: {
                allowCreate: false,
                description: {
                  en: "Every doctor whose Clinics list includes this one. They show on the clinic's page. Add a doctor here by editing the doctor.",
                  es: "Cada médico cuya lista de Clínicas incluye esta. Se muestran en la página de la clínica. Para añadir un médico, edite el médico.",
                },
              },
              collection: "doctors",
              label: { en: "Doctors at this clinic", es: "Médicos de esta clínica" },
              name: "doctors",
              on: "clinics",
              type: "join",
            },
          ],
          label: { en: "Clinic details", es: "Datos de la clínica" },
        },
        { ...entitySeoTab, label: { en: "SEO & Search", es: "SEO y buscadores" } },
      ],
      type: "tabs",
    },
    bilingual(
      entitySlugField("The last part of the clinic page's URL, for example downtown."),
      { en: "Slug", es: "Slug" },
      {
        en: "The last part of the clinic page's URL, for example downtown.",
        es: "La última parte de la URL de la página de la clínica, por ejemplo downtown.",
      }
    ),
    {
      admin: {
        description: {
          en: "The state this clinic is in. It is part of the clinic page's URL.",
          es: "El estado en el que está esta clínica. Forma parte de la URL de la página de la clínica.",
        },
        position: "sidebar",
      },
      index: true,
      label: { en: "State", es: "Estado" },
      name: "state",
      relationTo: "states",
      required: true,
      type: "relationship",
    },
    {
      admin: {
        description: {
          en: "Shows the accreditation callout on this clinic's page.",
          es: "Muestra el aviso de acreditación en la página de esta clínica.",
        },
        position: "sidebar",
      },
      defaultValue: true,
      label: { en: "Accredited clinic", es: "Clínica acreditada" },
      name: "accredited",
      type: "checkbox",
    },
  ],
  hooks: entityHooks,
  labels: {
    plural: { en: "Clinics", es: "Clínicas" },
    singular: { en: "Clinic", es: "Clínica" },
  },
  slug: "clinics",
  versions: entityVersions,
};

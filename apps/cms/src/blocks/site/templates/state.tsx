import type { Block, Field } from "payload";

import type { SiteBlockComponents } from "@/blocks/site/types";
import { LocationsAccordionComponent } from "@/components/site/state/LocationsAccordion";
import { StateDoctorsComponent } from "@/components/site/state/StateDoctors";
import { StateSitesComponent } from "@/components/site/state/StateSites";
import { bodyRichText, headingRichText } from "@/lib/fields/site/richText";
import { siteButton } from "@/lib/fields/site/siteLink";

import { rowTitle, siteBlock } from "../shared";
import { bilingual, bilingualBlock } from "../shared/fieldText";

const reviewsLabelField: Field = {
  admin: {
    description: {
      en: "The word after each clinic's number of reviews, for example Reviews.",
      es: "La palabra tras el número de reseñas de cada clínica, por ejemplo Reseñas.",
    },
    width: "50%",
  },
  label: { en: "Reviews word", es: "Palabra de reseñas" },
  name: "reviewsLabel",
  type: "text",
};

const clinicLinkTextField: Field = {
  admin: {
    description: {
      en: "The words on each clinic's button, for example Learn More. Empty hides the buttons.",
      es: "Las palabras del botón de cada clínica, por ejemplo Más Información. Vacío oculta los botones.",
    },
    width: "50%",
  },
  label: { en: "Clinic button text", es: "Texto del botón de clínica" },
  name: "linkText",
  type: "text",
};

const stateField = (description: { en: string; es: string }): Field => ({
  admin: { description },
  label: { en: "State", es: "Estado" },
  name: "state",
  relationTo: "states",
  type: "relationship",
});

export const StateSitesBlock: Block = bilingualBlock(
  siteBlock({
    fields: [
      { fields: [reviewsLabelField, clinicLinkTextField], type: "row" },
      stateField({
        en: "The state whose clinics are shown. Empty uses the state whose page this is. Clinics come from the clinic records, so an edited address, rating or new clinic shows here.",
        es: "El estado cuyas clínicas se muestran. Vacío usa el estado de esta página. Las clínicas salen de sus fichas, así que una dirección, valoración o clínica nueva se muestra aquí.",
      }),
    ],
    interfaceName: "StateSitesBlock",
    label: "State clinics and map",
    slug: "stateSites",
  }),
  { en: "State clinics and map", es: "Clínicas del estado y mapa" }
);

export const StateDoctorsBlock: Block = bilingualBlock(
  siteBlock({
    fields: [
      bilingual(
        headingRichText({
          description: "The section's heading.",
          label: "Heading",
          name: "heading",
        }),
        { en: "Heading", es: "Encabezado" },
        {
          en: "The section's heading, for example Meet Our Award-Winning Team of Vein Specialists.",
          es: "El encabezado de la sección, por ejemplo Conozca a nuestro galardonado equipo.",
        }
      ),
      bilingual(
        bodyRichText({ description: "The text under the heading.", label: "Text", name: "text" }),
        { en: "Text", es: "Texto" },
        {
          en: "The paragraph under the heading. Links to pages are allowed.",
          es: "El párrafo bajo el encabezado. Admite enlaces a páginas.",
        }
      ),
      {
        admin: { initCollapsed: true },
        fields: [
          stateField({
            en: "The state whose doctors are shown, each with the state's clinics they work at. Empty uses the state whose page this is.",
            es: "El estado cuyos médicos se muestran, cada uno con las clínicas del estado donde trabaja. Vacío usa el estado de esta página.",
          }),
          {
            admin: {
              description: {
                en: "The doctors shown, in this order. Empty shows every doctor with a clinic in the state, by name.",
                es: "Los médicos mostrados, en este orden. Vacío muestra todos los médicos con una clínica en el estado, por nombre.",
              },
            },
            hasMany: true,
            label: { en: "Doctors", es: "Médicos" },
            name: "doctors",
            relationTo: "doctors",
            type: "relationship",
          },
        ],
        label: { en: "Which doctors", es: "Qué médicos" },
        type: "collapsible",
      },
      {
        admin: {
          description: {
            en: "The words on each doctor's button on larger screens, for example Learn More. Empty hides them.",
            es: "Las palabras del botón de cada médico en pantallas grandes, por ejemplo Más Información. Vacío los oculta.",
          },
        },
        label: { en: "Card button text", es: "Texto del botón de tarjeta" },
        name: "cardButtonText",
        type: "text",
      },
      bilingual(
        siteButton(),
        { en: "Button", es: "Botón" },
        {
          en: "The button under the doctors. Empty text hides it.",
          es: "El botón bajo los médicos. Sin texto se oculta.",
        }
      ),
    ],
    interfaceName: "StateDoctorsBlock",
    label: "State doctors",
    slug: "stateDocs",
  }),
  { en: "State doctors", es: "Médicos del estado" }
);

export const LocationsAccordionBlock: Block = bilingualBlock(
  siteBlock({
    fields: [
      { fields: [reviewsLabelField, clinicLinkTextField], type: "row" },
      {
        admin: {
          description: {
            en: "The link under each group's clinics. {name} becomes the group's name, for example Learn more about our {name} vein clinics.",
            es: "El enlace bajo las clínicas de cada grupo. {name} se sustituye por el nombre del grupo, por ejemplo Obtenga más información sobre nuestras clínicas de venas de {name}.",
          },
        },
        label: { en: "State link text", es: "Texto del enlace al estado" },
        name: "allLinkText",
        type: "text",
      },
      {
        admin: {
          ...rowTitle("name", "Area"),
          description: {
            en: "Optional: split a state into areas, each its own group, for example Texas: Houston. Every state and clinic is listed on its own; a clinic of a split state that no area names stays in a group with the state's name.",
            es: "Opcional: divida un estado en zonas, cada una con su propio grupo, por ejemplo Texas: Houston. Cada estado y clínica se lista sola; una clínica de un estado dividido que ninguna zona nombra queda en un grupo con el nombre del estado.",
          },
        },
        fields: [
          {
            fields: [
              {
                admin: { width: "50%" },
                label: { en: "State", es: "Estado" },
                name: "state",
                relationTo: "states",
                required: true,
                type: "relationship",
              },
              {
                admin: {
                  description: {
                    en: "For example Dallas-Fort Worth.",
                    es: "Por ejemplo Dallas-Fort Worth.",
                  },
                  width: "50%",
                },
                label: { en: "Area name", es: "Nombre de la zona" },
                name: "name",
                required: true,
                type: "text",
              },
            ],
            type: "row",
          },
          {
            admin: {
              description: {
                en: "The clinics in this area.",
                es: "Las clínicas de esta zona.",
              },
            },
            hasMany: true,
            label: { en: "Clinics", es: "Clínicas" },
            name: "clinics",
            relationTo: "clinics",
            required: true,
            type: "relationship",
          },
        ],
        label: { en: "Areas", es: "Zonas" },
        labels: { plural: { en: "Areas", es: "Zonas" }, singular: { en: "Area", es: "Zona" } },
        name: "areas",
        type: "array",
      },
    ],
    interfaceName: "LocationsAccordionBlock",
    label: "Locations by state",
    slug: "locAccord",
  }),
  { en: "Locations by state", es: "Ubicaciones por estado" }
);

/** Sections that exist for the state page template. Registered in `@/blocks/siteBlocks`. */
export const stateBlocks: Block[] = [StateSitesBlock, StateDoctorsBlock, LocationsAccordionBlock];

export const stateBlockComponents: SiteBlockComponents = {
  locAccord: LocationsAccordionComponent,
  stateDocs: StateDoctorsComponent,
  stateSites: StateSitesComponent,
};

import type { Block } from "payload";

import { siteBlock } from "@/blocks/site/shared";
import { bilingual, bilingualBlock, mediaField } from "@/blocks/site/shared/fieldText";
import type { SiteBlockComponents } from "@/blocks/site/types";
import { ClinicSidebarComponent } from "@/components/site/clinic/ClinicSidebar";
import { bodyRichText, headingRichText } from "@/lib/fields/site/richText";

export const ClinicInfoBlock: Block = bilingualBlock(
  siteBlock({
    fields: [
      {
        admin: {
          description: {
            en: "The callout at the top of the section. It shows only while the clinic is marked Accredited clinic.",
            es: "El aviso en la parte superior de la sección. Solo se muestra mientras la clínica está marcada como Clínica acreditada.",
          },
          hideGutter: true,
        },
        fields: [
          bilingual(
            headingRichText({
              description: "The callout's heading.",
              label: "Heading",
              name: "heading",
            }),
            { en: "Heading", es: "Encabezado" },
            {
              en: "The callout's heading, for example Clinical Excellence You Can Trust.",
              es: "El encabezado del aviso, por ejemplo Excelencia clínica en la que puede confiar.",
            }
          ),
          bilingual(
            bodyRichText({ description: "The callout's text.", label: "Text", name: "text" }),
            { en: "Text", es: "Texto" },
            { en: "The paragraph under the heading.", es: "El párrafo bajo el encabezado." }
          ),
          mediaField(
            "image",
            { en: "Badge", es: "Sello" },
            {
              en: "The accreditation badge beside the text.",
              es: "El sello de acreditación junto al texto.",
            }
          ),
        ],
        label: { en: "Accreditation callout", es: "Aviso de acreditación" },
        name: "accredit",
        type: "group",
      },
      {
        fields: [
          {
            admin: {
              description: {
                en: "The words before the doctor's name on each doctor's button, for example Meet. The doctors themselves come from the clinic.",
                es: "El texto antes del nombre del médico en el botón de cada médico, por ejemplo Conozca al. Los médicos vienen de la clínica.",
              },
              width: "33%",
            },
            label: { en: "Doctor button text", es: "Texto del botón del médico" },
            name: "doctorButton",
            type: "text",
          },
          {
            admin: {
              description: {
                en: "The heading over the opening hours, for example Clinic Hours. The hours come from the clinic.",
                es: "El encabezado sobre el horario, por ejemplo Horarios de la clínica. El horario viene de la clínica.",
              },
              width: "33%",
            },
            label: { en: "Hours heading", es: "Encabezado del horario" },
            name: "hoursHeading",
            type: "text",
          },
          {
            admin: {
              description: {
                en: "The heading over the nearby areas, for example Located Near. The areas come from the clinic's Located near list.",
                es: "El encabezado sobre las zonas cercanas, por ejemplo Ubicado cerca de. Las zonas vienen de la lista Ubicado cerca de de la clínica.",
              },
              width: "34%",
            },
            label: { en: "Nearby heading", es: "Encabezado de zonas cercanas" },
            name: "nearHeading",
            type: "text",
          },
        ],
        type: "row",
      },
      bilingual(
        bodyRichText({ description: "The section's text.", label: "Text", name: "text" }),
        { en: "Text", es: "Texto" },
        {
          en: "The heading and paragraphs under the doctors, above the map.",
          es: "El encabezado y los párrafos bajo los médicos, sobre el mapa.",
        }
      ),
      {
        admin: {
          description: {
            en: "The heading over the directions, for example Getting To Our Vein Clinic. Empty hides it.",
            es: "El encabezado sobre las indicaciones, por ejemplo Cómo llegar a nuestra clínica. Vacío lo oculta.",
          },
        },
        label: { en: "Directions heading", es: "Encabezado de las indicaciones" },
        name: "directionsHeading",
        type: "text",
      },
      bilingual(
        bodyRichText({
          description: "How to get to the clinic.",
          label: "Directions",
          name: "directions",
        }),
        { en: "Directions", es: "Indicaciones" },
        {
          en: "How to get to the clinic, beside the map. Empty hides it.",
          es: "Cómo llegar a la clínica, junto al mapa. Vacío lo oculta.",
        }
      ),
      {
        admin: {
          description: {
            en: "The clinic whose doctors, map, hours and nearby areas the section shows. Empty shows the clinic whose page this is.",
            es: "La clínica cuyos médicos, mapa, horario y zonas cercanas muestra la sección. Vacío muestra la clínica de esta página.",
          },
        },
        label: { en: "Clinic", es: "Clínica" },
        name: "clinic",
        relationTo: "clinics",
        type: "relationship",
      },
    ],
    interfaceName: "ClinicInfoBlock",
    label: "Clinic details and map",
    slug: "clinicInfo",
  }),
  { en: "Clinic details and map", es: "Datos de la clínica y mapa" }
);

/** Sections that exist for the clinic page template. Registered in `@/blocks/siteBlocks`. */
export const clinicBlocks: Block[] = [ClinicInfoBlock];

export const clinicBlockComponents: SiteBlockComponents = {
  clinicInfo: ClinicSidebarComponent,
};

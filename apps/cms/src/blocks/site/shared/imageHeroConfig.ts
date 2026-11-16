import type { Block } from "payload";

import { bodyRichText, headingRichText } from "@/lib/fields/site/richText";
import { siteButton, siteLink } from "@/lib/fields/site/siteLink";

import { rowTitle, siteBlock } from "../shared";
import { bilingual, bilingualBlock, mediaField } from "./fieldText";

export const IMAGE_HERO_SIZES = ["regular", "large"] as const;

export type ImageHeroSize = (typeof IMAGE_HERO_SIZES)[number];

export const ImageHeroBlock: Block = bilingualBlock(
  siteBlock({
    fields: [
      {
        admin: {
          description: {
            en: "Regular puts the picture beside the text. Large centres the text over a wide picture.",
            es: "Normal coloca la imagen junto al texto. Grande centra el texto sobre una imagen ancha.",
          },
        },
        defaultValue: "regular",
        label: { en: "Size", es: "Tamaño" },
        name: "size",
        options: [
          {
            label: { en: "Regular, picture beside", es: "Normal, imagen al lado" },
            value: "regular",
          },
          { label: { en: "Large, centred", es: "Grande, centrado" }, value: "large" },
        ],
        type: "select",
      },
      {
        admin: {
          ...rowTitle("text", "Step"),
          description: {
            en: "The trail above the heading, for example Locations / Texas / Allen. The last step usually has no link. Empty hides the trail.",
            es: "La ruta sobre el encabezado, por ejemplo Ubicaciones / Texas / Allen. El último paso no suele llevar enlace. Vacío la oculta.",
          },
        },
        fields: [
          {
            admin: {
              description: { en: "The words of this step.", es: "El texto de este paso." },
            },
            label: { en: "Text", es: "Texto" },
            name: "text",
            required: true,
            type: "text",
          },
          bilingual(
            siteLink({ label: "Links to", name: "link" }),
            { en: "Links to", es: "Enlaza a" },
            {
              en: "Where this step leads. Without a link the step shows as plain text.",
              es: "Adónde lleva este paso. Sin enlace se muestra como texto.",
            }
          ),
        ],
        label: { en: "Breadcrumbs", es: "Migas de pan" },
        labels: {
          plural: { en: "Steps", es: "Pasos" },
          singular: { en: "Step", es: "Paso" },
        },
        name: "crumbs",
        type: "array",
      },
      bilingual(
        headingRichText({
          description: "The page's main heading.",
          label: "Heading",
          name: "heading",
          required: true,
        }),
        { en: "Heading", es: "Encabezado" },
        { en: "The page's main heading.", es: "El encabezado principal de la página." }
      ),
      {
        admin: {
          description: {
            en: "The smaller line under the heading. Empty hides it.",
            es: "La línea más pequeña bajo el encabezado. Vacío la oculta.",
          },
        },
        label: { en: "Subheading", es: "Subtítulo" },
        name: "subheading",
        type: "text",
      },
      bilingual(
        bodyRichText({
          description: "The reviewer line.",
          label: "Reviewed by",
          name: "reviewer",
        }),
        { en: "Reviewed by", es: "Revisado por" },
        {
          en: "A short line under the heading, for example Medically reviewed by and a link to the doctor. Empty hides it.",
          es: "Una línea corta bajo el encabezado, por ejemplo Revisado médicamente por y un enlace al médico. Vacío la oculta.",
        }
      ),
      bilingual(
        bodyRichText({ description: "The text under the heading.", label: "Text", name: "text" }),
        { en: "Text", es: "Texto" },
        { en: "The paragraph under the heading.", es: "El párrafo bajo el encabezado." }
      ),
      {
        admin: {
          description: {
            en: "A street address, one line per row. It links down to the map section of the page. Empty hides it.",
            es: "Una dirección, una línea por renglón. Enlaza a la sección del mapa de la página. Vacío la oculta.",
          },
        },
        label: { en: "Address", es: "Dirección" },
        name: "address",
        type: "textarea",
      },
      bilingual(
        siteButton(),
        { en: "Button", es: "Botón" },
        { en: "Empty text hides the button.", es: "Sin texto, el botón no se muestra." }
      ),
      {
        fields: [
          {
            admin: {
              description: {
                en: "The words before the phone number, for example Or Call:.",
                es: "El texto antes del teléfono, por ejemplo O llame al:.",
              },
              width: "50%",
            },
            label: { en: "Phone line text", es: "Texto de la línea del teléfono" },
            name: "phoneLabel",
            type: "text",
          },
          {
            admin: {
              description: {
                en: "The phone number under the button, for example 888-555-0100. Empty hides the line.",
                es: "El teléfono bajo el botón, por ejemplo 888-555-0100. Vacío oculta la línea.",
              },
              width: "50%",
            },
            label: { en: "Phone", es: "Teléfono" },
            name: "phone",
            type: "text",
          },
        ],
        type: "row",
      },
      {
        fields: [
          mediaField(
            "image",
            { en: "Picture", es: "Imagen" },
            {
              en: "The picture beside the text, or under it in the large size.",
              es: "La imagen junto al texto, o debajo en el tamaño grande.",
            }
          ),
          mediaField(
            "mobileImage",
            { en: "Phone picture", es: "Imagen para móvil" },
            {
              en: "A second picture shown on phones instead. Empty shows the first picture on phones too.",
              es: "Una segunda imagen que se muestra en móviles. Vacío muestra la primera también en móviles.",
            }
          ),
        ],
        type: "row",
      },
    ],
    interfaceName: "ImageHeroBlock",
    label: "Hero with side picture",
    slug: "imageHero",
  }),
  { en: "Hero with side picture", es: "Hero con imagen lateral" }
);

import type { Block } from "payload";

import { bodyRichText, headingRichText } from "@/lib/fields/site/richText";

import { siteBlock } from "../shared";
import { bilingual, bilingualBlock } from "./fieldText";

export const SimpleHeroBlock: Block = bilingualBlock(
  siteBlock({
    fields: [
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
      bilingual(
        bodyRichText({ description: "The text under the heading.", label: "Text", name: "text" }),
        { en: "Text", es: "Texto" },
        {
          en: "The paragraph under the heading. Links to pages are allowed.",
          es: "El párrafo bajo el encabezado. Admite enlaces a páginas.",
        }
      ),
    ],
    interfaceName: "SimpleHeroBlock",
    label: "Hero, centred text",
    slug: "simpleHero",
  }),
  { en: "Hero, centred text", es: "Hero, texto centrado" }
);

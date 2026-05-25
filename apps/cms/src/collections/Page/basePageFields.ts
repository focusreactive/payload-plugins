import type { Field } from "payload";

import { CardsGridBlock } from "@/blocks/CardsGrid/config";
import { CarouselBlock } from "@/blocks/Carousel/config";
import { ContentBlock } from "@/blocks/Content/config";
import { FaqBlock } from "@/blocks/Faq/config";
import { HeroBlock } from "@/blocks/Hero/config";
import { LinksListBlock } from "@/blocks/LinksList/config";
import { LogosBlock } from "@/blocks/Logos/config";
import { TestimonialsListBlock } from "@/blocks/TestimonialsList/config";
import { TextSectionBlock } from "@/blocks/TextSection/config";
import { generateSeoFields } from "@/core/lib/seoFields";

export function createBasePageFields({ withBlocksDefaultValue = false } = {}): Field[] {
  return [
    {
      admin: {
        description: {
          en: "The header to display on the page",
          es: "El header a mostrar en la página",
        },
      },
      name: "header",
      relationTo: "header",
      type: "relationship",
    },
    {
      admin: {
        description: {
          en: "The footer to display on the page",
          es: "El footer a mostrar en la página",
        },
      },
      name: "footer",
      relationTo: "footer",
      type: "relationship",
    },
    {
      tabs: [
        {
          fields: [
            {
              admin: {
                initCollapsed: false,
              },
              blocks: [HeroBlock, TextSectionBlock, ContentBlock, FaqBlock, TestimonialsListBlock, CardsGridBlock, CarouselBlock, LogosBlock, LinksListBlock],
              localized: true,
              name: "blocks",
              required: true,
              type: "blocks",
              ...(withBlocksDefaultValue && {
                defaultValue: () => ["hero", "textSection", "content", "testimonialsList", "faq"].map((blockType) => ({ blockType })),
              }),
            },
          ],
          label: { en: "Content", es: "Contenido" },
        },
        {
          fields: generateSeoFields(),
          label: { en: "SEO", es: "SEO" },
          localized: true,
          name: "meta",
        },
      ],
      type: "tabs",
    },
  ];
}

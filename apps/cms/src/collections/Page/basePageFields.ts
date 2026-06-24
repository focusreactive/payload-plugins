import type { Field } from "payload";

import { CardsGridBlock } from "@/blocks/CardsGrid/config";
import { CarouselBlock } from "@/blocks/Carousel/config";
import { ChartBlock } from "@/blocks/Chart/config";
import { ContentBlock } from "@/blocks/Content/config";
import { CtaBandBlock } from "@/blocks/CtaBand/config";
import { NewsletterBlock } from "@/blocks/Newsletter/config";
import { StatsBlock } from "@/blocks/Stats/config";
import { FaqBlock } from "@/blocks/Faq/config";
import { HeroBlock } from "@/blocks/Hero/config";
import { LogosBlock } from "@/blocks/Logos/config";
import { RawHtmlBlock } from "@/blocks/RawHtml/config";
import { TestimonialsListBlock } from "@/blocks/TestimonialsList/config";
import { generateSeoFields } from "@/lib/utils/seoFields";

export function createBasePageFields({ withBlocksDefaultValue = false } = {}): Field[] {
  return [
    {
      type: "row",
      fields: [
        {
          admin: {
            width: "50%",
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
            width: "50%",
            description: {
              en: "The footer to display on the page",
              es: "El footer a mostrar en la página",
            },
          },
          name: "footer",
          relationTo: "footer",
          type: "relationship",
        },
      ],
    },
    {
      tabs: [
        {
          fields: [
            {
              admin: {
                initCollapsed: false,
              },
              blocks: [
                HeroBlock,
                ContentBlock,
                FaqBlock,
                TestimonialsListBlock,
                CardsGridBlock,
                CarouselBlock,
                LogosBlock,
                ChartBlock,
                CtaBandBlock,
                NewsletterBlock,
                StatsBlock,
                RawHtmlBlock,
              ],
              localized: true,
              name: "blocks",
              required: true,
              type: "blocks",
              ...(withBlocksDefaultValue && {
                defaultValue: () =>
                  ["hero", "content", "testimonialsList", "faq"].map((blockType) => ({
                    blockType,
                  })),
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

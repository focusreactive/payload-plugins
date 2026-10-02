import { extractCardsGridText } from "@/blocks/CardsGrid/extractText";
import { extractCarouselText } from "@/blocks/Carousel/extractText";
import { extractChartText } from "@/blocks/Chart/extractText";
import { extractCtaBandText } from "@/blocks/CtaBand/extractText";
import { extractNewsletterText } from "@/blocks/Newsletter/extractText";
import { extractStatsText } from "@/blocks/Stats/extractText";
import { extractFaqText } from "@/blocks/Faq/extractText";
import { extractHeroText } from "@/blocks/Hero/extractText";
import { extractLogosText } from "@/blocks/Logos/extractText";
import { extractTestimonialsText } from "@/blocks/TestimonialsList/extractText";
import { extractLexicalText, joinText, sectionHeadingText } from "@/lib/utils/text";
import type { Page } from "@/payload-types";

export function extractPageBlockText(block: Page["blocks"][number]): string {
  switch (block.blockType) {
    case "content": {
      return joinText([...sectionHeadingText(block.heading), extractLexicalText(block.content)]);
    }
    case "chart": {
      return extractChartText(block);
    }
    case "ctaBand": {
      return extractCtaBandText(block);
    }
    case "faq": {
      return extractFaqText(block);
    }
    case "testimonialsList": {
      return extractTestimonialsText(block);
    }
    case "cardsGrid": {
      return extractCardsGridText(block);
    }
    case "carousel": {
      return extractCarouselText(block);
    }
    case "logos": {
      return extractLogosText(block);
    }
    case "newsletter": {
      return extractNewsletterText(block);
    }
    case "stats": {
      return extractStatsText(block);
    }
    default: {
      return "";
    }
  }
}

export function extractPageText(page: Pick<Page, "title" | "hero" | "blocks">): string {
  return joinText([
    page.title,
    ...(page.hero ?? []).map(extractHeroText),
    ...(page.blocks ?? []).map(extractPageBlockText),
  ]);
}

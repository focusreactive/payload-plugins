import { extractBookOfferText } from "@/blocks/BookOffer/extractText";
import { extractCardsGridText } from "@/blocks/CardsGrid/extractText";
import { extractCarouselText } from "@/blocks/Carousel/extractText";
import { extractChartText } from "@/blocks/Chart/extractText";
import { extractCourseRailText } from "@/blocks/CourseRail/extractText";
import { extractCtaBandText } from "@/blocks/CtaBand/extractText";
import { extractHeroSpotlightText } from "@/blocks/HeroSpotlight/extractText";
import { extractMembershipTiersText } from "@/blocks/MembershipTiers/extractText";
import { extractPortraitFeatureText } from "@/blocks/PortraitFeature/extractText";
import { extractNewsletterText } from "@/blocks/Newsletter/extractText";
import { extractStatsText } from "@/blocks/Stats/extractText";
import { extractFaqText } from "@/blocks/Faq/extractText";
import { extractHeroText } from "@/blocks/Hero/extractText";
import { extractLogosText } from "@/blocks/Logos/extractText";
import { extractTestimonialsText } from "@/blocks/TestimonialsList/extractText";
import { extractLexicalText, joinText } from "@/lib/utils/text";
import type { Page } from "@/payload-types";

export function extractPageBlockText(block: Page["blocks"][number]): string {
  switch (block.blockType) {
    case "hero": {
      return extractHeroText(block);
    }
    case "content": {
      return joinText([
        block.eyebrow,
        block.heading,
        block.description,
        extractLexicalText(block.content),
      ]);
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
    case "heroSpotlight": {
      return extractHeroSpotlightText(block);
    }
    case "courseRail": {
      return extractCourseRailText(block);
    }
    case "membershipTiers": {
      return extractMembershipTiersText(block);
    }
    case "portraitFeature": {
      return extractPortraitFeatureText(block);
    }
    case "bookOffer": {
      return extractBookOfferText(block);
    }
    /*
     * A block with no case here contributes nothing to the page's text, which is what SEO and the
     * search index read - and it does so silently, because an unmatched blockType is indistinguishable
     * from a block that genuinely has no words in it. A new block is not finished until it appears
     * above.
     */
    default: {
      return "";
    }
  }
}

export function extractPageText(page: Pick<Page, "title" | "blocks">): string {
  return joinText([page.title, ...(page.blocks ?? []).map(extractPageBlockText)]);
}

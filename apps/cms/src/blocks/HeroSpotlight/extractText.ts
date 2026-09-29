import type { HeroSpotlightBlock } from "@/payload-types";
import { joinText } from "@/lib/utils/text";

export function extractHeroSpotlightText(block: HeroSpotlightBlock): string {
  return joinText([
    block.eyebrow,
    block.heading,
    block.introText,
    block.ctaLink?.label,
    block.featuredCard?.label,
    block.featuredCard?.title,
  ]);
}

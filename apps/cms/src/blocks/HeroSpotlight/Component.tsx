import { HeroSpotlight } from "./ui";
import { SectionContainer } from "@/components/shared";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { HeroSpotlightBlock } from "@/payload-types";

const FALLBACK_BACKGROUND_SRC = "/design/girl-in-meadow-pure-sky-plus.webp";
const FALLBACK_BACKGROUND_ALT = "Woman resting in a sunlit meadow";
const FALLBACK_CARD_IMAGE_SRC = "/design/pink-flower.webp";

const FOCAL_POINT_OBJECT_POSITIONS: Record<string, string> = {
  bottom: "center 85%",
  centre: "center 50%",
  "lower-middle": "center 68%",
  top: "center 15%",
  "upper-middle": "center 42%",
};

const DEFAULT_OBJECT_POSITION = FOCAL_POINT_OBJECT_POSITIONS["upper-middle"];

export async function HeroSpotlightBlockComponent({
  eyebrow,
  heading,
  introText,
  ctaLink,
  backgroundImage,
  backgroundFocalPoint,
  photoDarkening,
  showFeaturedCard,
  featuredCard,
  section,
  id,
}: HeroSpotlightBlock) {
  const locale = await resolveLocale();

  const backgroundMedia = prepareMediaProps(backgroundImage);
  const backgroundSrc =
    typeof backgroundMedia.data.src === "string" && backgroundMedia.data.src.length > 0
      ? backgroundMedia.data.src
      : FALLBACK_BACKGROUND_SRC;
  const backgroundAlt =
    backgroundMedia.data.kind === "image" && backgroundMedia.data.alt
      ? backgroundMedia.data.alt
      : FALLBACK_BACKGROUND_ALT;

  const preparedCtaLink = prepareLinkProps(ctaLink, locale);

  const cardMedia = prepareMediaProps(featuredCard?.image);
  const cardImageSrc =
    typeof cardMedia.data.src === "string" && cardMedia.data.src.length > 0
      ? cardMedia.data.src
      : FALLBACK_CARD_IMAGE_SRC;
  const cardImageAlt =
    cardMedia.data.kind === "image" && cardMedia.data.alt
      ? cardMedia.data.alt
      : (featuredCard?.title ?? "");

  const cardDate = featuredCard?.date ? new Date(featuredCard.date) : null;
  const preparedCardLink = prepareLinkProps(featuredCard?.link, locale);

  return (
    <SectionContainer
      className="py-[clamp(12px,2vw,24px)]"
      containerClassName="px-[clamp(12px,2vw,24px)]"
      sectionData={{ ...section, id }}
    >
      <HeroSpotlight
        backgroundImage={{ alt: backgroundAlt, src: backgroundSrc }}
        backgroundObjectPosition={
          FOCAL_POINT_OBJECT_POSITIONS[backgroundFocalPoint ?? ""] ?? DEFAULT_OBJECT_POSITION
        }
        ctaLink={
          preparedCtaLink.text
            ? {
                href: preparedCtaLink.href || "#",
                label: preparedCtaLink.text,
                opensInNewTab: Boolean(ctaLink?.newTab),
              }
            : null
        }
        eyebrow={eyebrow}
        featuredCard={
          showFeaturedCard && featuredCard
            ? {
                compareAtPrice: featuredCard.compareAtPrice,
                // The stored day is read back in UTC so the card never slips a day on a server
                // running in a negative-offset timezone.
                dateIso: cardDate ? cardDate.toISOString().slice(0, 10) : null,
                dateLabel: cardDate
                  ? cardDate.toLocaleDateString(locale, {
                      day: "numeric",
                      month: "short",
                      timeZone: "UTC",
                      year: "numeric",
                    })
                  : null,
                href: preparedCardLink.href || "#",
                image: { alt: cardImageAlt, src: cardImageSrc },
                label: featuredCard.label,
                opensInNewTab: Boolean(featuredCard.link?.newTab),
                price: featuredCard.price,
                rating: featuredCard.rating,
                title: featuredCard.title,
              }
            : null
        }
        heading={heading}
        introText={introText}
        photoDarkening={photoDarkening ?? 0}
      />
    </SectionContainer>
  );
}

import { cn } from "@/components/utils";
import { Media } from "@/components/media";
import type { PreparedMedia } from "@/components/media";
import { Link } from "@/components/link";
import type { LinkProps } from "@/components/link/types";
import { RichText } from "@/components/richText";
import { Badge } from "@/shared/ui/shadcn/base/badges/badges";
import type { IHeroProps } from "./types";

interface HeroActionsProps {
  links: LinkProps[];
  className?: string;
}

function HeroActions({ links, className }: HeroActionsProps) {
  if (!links?.length) return null;
  return (
    <ul
      className={cn(
        "mt-8 flex w-full flex-col-reverse items-stretch gap-3 md:mt-12 md:flex-row md:items-start",
        className
      )}
    >
      {links.map((link, i) => (
        <li key={i}>
          <Link {...link} />
        </li>
      ))}
    </ul>
  );
}

/**
 * No fixed aspect class here: prepareMediaProps already turns the CMS "Aspect Ratio" field into a
 * CSS aspect-ratio on the image itself, and a competing Tailwind aspect-[...] on this wrapper would
 * win over it (an inline style loses to nothing, but a sibling fixed-height ancestor forces the
 * inner aspect-ratio box to auto and it stops doing anything) - which is exactly why every hero
 * image, seeded as 16/9, used to render forced into a 4/5 portrait crop. Untitled's own height and
 * corner-radius classes go on imageProps.className (the actual <img>) instead, never on this
 * wrapper, for the same reason.
 */
function HeroImage({ image }: { image: PreparedMedia }) {
  return (
    <div className="relative w-full overflow-hidden">
      <Media
        {...image.data}
        visualEditing={image.visualEditing}
        imageProps={{
          ...image.imageProps,
          className: cn(
            image.imageProps?.className,
            "inset-0 h-60 w-full rounded-tr-[32px] rounded-bl-[32px] object-cover md:h-110 md:rounded-tr-[64px] md:rounded-bl-[64px] lg:h-full"
          ),
        }}
      />
    </div>
  );
}

/**
 * Ported from Untitled UI's marketing/header-section/hero-split-image-05.tsx. Dropped from the
 * source: the outer bg-primary/overflow-hidden shell, the two decorative grid-pattern images and
 * the <Header/> - SectionContainer (one level up, wired in Component.tsx) already supplies
 * "relative overflow-hidden", the section's vertical padding and the theme-driven background, so
 * repeating any of those here would double the padding or silently override the CMS theme choice.
 */
export function Hero({ badge, title, text, image, links }: IHeroProps) {
  const hasImage = typeof image?.data?.src === "string" && image.data.src.length > 0;

  return (
    <div className="relative mx-auto grid max-w-container grid-cols-1 gap-16 px-4 md:px-8 lg:min-h-160 lg:items-center">
      <div className="z-10 flex max-w-200 flex-col items-start">
        {badge && (
          <Badge size="md" type="pill-color" color="brand" className="mb-4">
            {badge}
          </Badge>
        )}
        <h1 className="text-display-md font-semibold text-primary md:text-display-lg lg:text-display-xl">
          {title}
        </h1>
        <RichText
          {...text}
          className="mt-4 max-w-xl text-lg text-balance text-tertiary md:mt-6 md:text-xl"
        />
        <HeroActions links={links} />
      </div>

      {hasImage && (
        <div className="relative lg:absolute lg:top-0 lg:right-8 lg:h-full lg:w-140">
          <HeroImage image={image} />
        </div>
      )}
    </div>
  );
}

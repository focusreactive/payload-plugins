import { cn } from "@/components/utils";
import { DisplayHeading } from "@/components/DisplayHeading";
import { Media } from "@/components/media";
import type { PreparedMedia } from "@/components/media";
import { Link } from "@/components/link";
import type { LinkProps } from "@/components/link/types";
import { Eyebrow } from "@/components/Eyebrow";
import { RichText } from "@/components/richText";
import type { IHeroProps } from "./types";

interface HeroBadgeProps {
  badge?: string | null;
}

function HeroBadge({ badge }: HeroBadgeProps) {
  if (!badge) return null;
  return <Eyebrow prefix="none">{badge}</Eyebrow>;
}

interface HeroActionsProps {
  links: LinkProps[];
  className?: string;
}

function HeroActions({ links, className }: HeroActionsProps) {
  if (!links?.length) return null;
  return (
    <ul className={cn("flex flex-wrap items-center gap-4", className)}>
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
 * image, seeded as 16/9, used to render forced into a 4/5 portrait crop.
 */
function HeroImage({ image, className }: { image: PreparedMedia; className?: string }) {
  return (
    <div className={cn("relative w-full overflow-hidden rounded-[4px]", className)}>
      <Media {...image.data} visualEditing={image.visualEditing} imageProps={image.imageProps} />
    </div>
  );
}

/**
 * Adapted from Tailark's hero-section/one.tsx: a text column held to roughly half the row width
 * with the image occupying an independent column beside it, not stretched to match its height.
 * Dropped from the source: the skewed 3D screenshot mockup, the gradient backdrop and the
 * "Trusted by" logo strip - all SaaS decoration DESIGN.md doesn't carry, and the logo strip
 * duplicates the site's own Logos block.
 */
function HeroShowcase({ badge, title, text, image, links }: Omit<IHeroProps, "variant" | "theme">) {
  const hasImage = typeof image?.data?.src === "string" && image.data.src.length > 0;

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
      <div className={cn("flex flex-col gap-8", hasImage ? "lg:col-span-7" : "lg:col-span-9")}>
        <HeroBadge badge={badge} />
        <DisplayHeading as="h1" size="display-1" text={title} className="display-serif" />
        <div className="measure text-muted-foreground">
          <RichText {...text} />
        </div>
        <HeroActions links={links} />
      </div>
      {hasImage && (
        <div className="lg:col-span-4 lg:col-start-9 lg:self-start">
          <HeroImage image={image} />
        </div>
      )}
    </div>
  );
}

/**
 * Adapted from Tailark's hero-section/five.tsx and six.tsx: centered heading and copy above a
 * single image below the fold. Dropped from the source: the second, inset "app screenshot" layered
 * on top of a background photo (this block has one image field, not two), the shadow/ring frame
 * (a hairline border instead, per DESIGN.md), and the "Trusted by" logo strip.
 */
function HeroCentered({ badge, title, text, image, links }: Omit<IHeroProps, "variant" | "theme">) {
  const hasImage = typeof image?.data?.src === "string" && image.data.src.length > 0;

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <HeroBadge badge={badge} />
      <DisplayHeading
        as="h1"
        size="display-1"
        text={title}
        className="display-serif mx-auto max-w-3xl"
      />
      <div className="measure mx-auto text-muted-foreground">
        <RichText {...text} />
      </div>
      <HeroActions links={links} className="justify-center" />
      {hasImage && <HeroImage image={image} className="mt-4 max-w-4xl border border-border" />}
    </div>
  );
}

/**
 * No backdrop and no grid lines here, and none anywhere else either: DESIGN.md bans decorative
 * background art, so the structure has to come from type size, whitespace and one hairline rule.
 */
export function Hero({ variant, badge, title, text, image, links }: IHeroProps) {
  const HeroVariantComponent = variant === "centered" ? HeroCentered : HeroShowcase;

  return (
    <HeroVariantComponent badge={badge} title={title} text={text} image={image} links={links} />
  );
}

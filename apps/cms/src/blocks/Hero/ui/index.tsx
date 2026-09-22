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

function HeroImage({ image }: { image: PreparedMedia }) {
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[4px]">
      <Media {...image.data} visualEditing={image.visualEditing} imageProps={image.imageProps} />
    </div>
  );
}

/**
 * No backdrop and no grid lines here, and none anywhere else either: DESIGN.md bans decorative
 * background art, so the structure has to come from type size, whitespace and one hairline rule.
 */
export function Hero({ badge, title, text, image, links }: IHeroProps) {
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
        <div className="lg:col-span-4 lg:col-start-9">
          <HeroImage image={image} />
        </div>
      )}
    </div>
  );
}

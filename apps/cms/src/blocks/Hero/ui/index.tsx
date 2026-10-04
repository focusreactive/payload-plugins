import { cn, resolveBackdropTone } from "@/components/utils";
import { AbstractBackdrop } from "@/components/AbstractBackdrop";
import { DisplayHeading } from "@/components/DisplayHeading";
import { GridLines } from "@/components/GridLines";
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
  return (
    <Eyebrow tone="accent" prefix="dot">
      {badge}
    </Eyebrow>
  );
}

interface HeroActionsProps {
  links: LinkProps[];
  className?: string;
}

function HeroActions({ links, className }: HeroActionsProps) {
  if (!links?.length) return null;
  return (
    <ul className={cn("flex flex-wrap items-center gap-3.5", className)}>
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
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border">
      <Media
        {...image.data}
        className="absolute inset-0"
        visualEditing={image.visualEditing}
        imageProps={{ ...image.imageProps, className: "object-cover", fill: true }}
      />
    </div>
  );
}

export function Hero({ variant, theme, badge, title, text, image, links, band }: IHeroProps) {
  const backdropTone = resolveBackdropTone(theme);
  const hasImage = typeof image?.data?.src === "string" && image.data.src.length > 0;

  if (band) {
    return (
      <>
        <AbstractBackdrop tone={backdropTone} intensity="subtle" />
        <div className="relative z-1 flex min-h-[clamp(160px,20vh,240px)] max-w-[900px] flex-col justify-end gap-4">
          <HeroBadge badge={badge} />
          <DisplayHeading as="h1" size="display-2" text={title} />
        </div>
      </>
    );
  }

  if (variant === "centered") {
    return (
      <>
        <AbstractBackdrop variant="blobs" tone={backdropTone} />
        <GridLines tone={backdropTone} />
        <div className="relative z-1 mx-auto flex min-h-[clamp(320px,44vh,520px)] max-w-[840px] flex-col items-center justify-center gap-6 text-center">
          <HeroBadge badge={badge} />
          <DisplayHeading as="h1" size="display-1" text={title} className="text-balance" />
          <div className="text-lead max-w-[600px] text-muted-foreground">
            <RichText {...text} />
          </div>
          <HeroActions links={links} className="mt-2 justify-center" />
        </div>
      </>
    );
  }

  return (
    <>
      <AbstractBackdrop variant="orbs" tone={backdropTone} />
      <GridLines tone={backdropTone} />
      <div
        className={cn(
          "relative z-1 grid grid-cols-1 items-center gap-10 lg:gap-16",
          hasImage && "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
        )}
      >
        <div className="flex max-w-[620px] flex-col gap-6">
          <HeroBadge badge={badge} />
          <DisplayHeading as="h1" size="display-1" text={title} />
          <div className="text-lead max-w-[520px] text-muted-foreground">
            <RichText {...text} />
          </div>
          <HeroActions links={links} className="mt-2" />
        </div>
        {hasImage && <HeroImage image={image} />}
      </div>
    </>
  );
}

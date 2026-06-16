import { cn, resolveBackdropTone } from "../../../utils";
import { AbstractBackdrop } from "../../ui/AbstractBackdrop";
import { DisplayHeading } from "../../ui/DisplayHeading";
import { GridLines } from "../../ui/GridLines";
import { Image } from "../../ui/image";
import type { IImageProps } from "../../ui/image/types";
import { Link } from "../../ui/link";
import type { LinkProps } from "../../ui/link/types";
import { Eyebrow } from "../../ui/Eyebrow";
import { RichText } from "../../ui/richText";
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

function HeroImage({ image }: { image: IImageProps }) {
  return (
    <div className="relative ml-auto aspect-[4/3] w-full max-w-[480px] overflow-hidden rounded-md">
      <Image {...image} fit="cover" quality={85} sizes="(max-width: 900px) 92vw, 480px" />
    </div>
  );
}

export function Hero({ variant, theme, badge, title, text, image, links }: IHeroProps) {
  const backdropTone = resolveBackdropTone(theme);
  const hasImage = typeof image?.src === "string" && image.src.length > 0;

  if (variant === "centered") {
    return (
      <>
        <AbstractBackdrop variant="blobs" tone={backdropTone} />
        <GridLines tone={backdropTone} />
        <div className="relative z-1 mx-auto flex max-w-[840px] flex-col items-center gap-6 text-center">
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
      <div className={cn("relative z-1 grid grid-cols-1 items-center gap-10 lg:gap-16", hasImage && "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]")}>
        <div className="flex max-w-[620px] flex-col gap-6">
          <HeroBadge badge={badge} />
          <DisplayHeading as="h1" size="display-1" text={title} />
          <div className="text-lead max-w-[520px] text-muted-foreground">
            <RichText {...text} />
          </div>
          <HeroActions links={links} className="mt-2" />
        </div>
        {hasImage && (
          <div className="hidden lg:block">
            <HeroImage image={image} />
          </div>
        )}
      </div>
    </>
  );
}

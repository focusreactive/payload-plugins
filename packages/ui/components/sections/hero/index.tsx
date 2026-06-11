import { cn } from "../../../utils";
import { AbstractBackdrop } from "../../ui/AbstractBackdrop";
import { DisplayHeading } from "../../ui/DisplayHeading";
import { GridLines } from "../../ui/GridLines";
import { Image } from "../../ui/image";
import type { IImageProps } from "../../ui/image/types";
import { Link } from "../../ui/link";
import type { LinkProps } from "../../ui/link/types";
import { Pill } from "../../ui/Pill";
import { RichText } from "../../ui/richText";
import type { HeroTheme, IHeroProps } from "./types";

function isDarkZone(theme: HeroTheme | undefined): boolean {
  return theme === "dark" || theme === "dark-gray";
}

interface HeroBadgeProps {
  badge?: string | null;
}

function HeroBadge({ badge }: HeroBadgeProps) {
  if (!badge) return null;
  return <Pill tone="accent">{badge}</Pill>;
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

function ShowcaseWindow({ image }: { image: IImageProps }) {
  return (
    <div className="ml-auto w-full max-w-[480px] rounded-md border border-border-strong bg-surface p-[26px] shadow-[0_44px_90px_-34px_rgba(0,0,0,0.55)] motion-safe:animate-[hero-bob_8s_var(--ease-in-out)_infinite]">
      <div aria-hidden className="mb-4 flex items-center gap-[7px]">
        <span className="size-[9px] rounded-pill bg-muted-foreground/40" />
        <span className="size-[9px] rounded-pill bg-muted-foreground/40" />
        <span className="size-[9px] rounded-pill bg-accent" />
      </div>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm">
        <Image {...image} fit="cover" quality={85} sizes="(max-width: 900px) 92vw, 480px" />
      </div>
    </div>
  );
}

export function Hero({ variant, theme, badge, title, text, image, links }: IHeroProps) {
  const backdropTone = isDarkZone(theme) ? "dark" : "light";
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

  if (variant === "showcase") {
    return (
      <>
        <AbstractBackdrop variant="orbs" tone={backdropTone} />
        <GridLines tone={backdropTone} />
        <div className="relative z-1 grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
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
              <ShowcaseWindow image={image} />
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="relative z-1 flex min-h-[min(88vh,820px)] flex-col justify-center">
      <div className="flex max-w-[620px] flex-col gap-6">
        <HeroBadge badge={badge} />
        <DisplayHeading as="h1" size="display-1" text={title} />
        <div className="text-lead max-w-[520px] text-muted-foreground">
          <RichText {...text} />
        </div>
        <HeroActions links={links} className="mt-2" />
      </div>
    </div>
  );
}

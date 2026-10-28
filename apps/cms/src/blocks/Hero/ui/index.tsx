import { cn, resolveBackdropTone } from "@/components/utils";
import { AbstractBackdrop } from "@/components/AbstractBackdrop";
import { GridLines } from "@/components/GridLines";
import { Media } from "@/components/media";
import type { PreparedMedia } from "@/components/media";
import { Link } from "@/components/link";
import type { LinkProps } from "@/components/link/types";
import { SectionHeading } from "@/components/SectionHeading";
import type { IHeroProps } from "./types";

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
    <div className="relative ml-auto w-full max-w-[480px] overflow-hidden rounded-md">
      <Media {...image.data} visualEditing={image.visualEditing} imageProps={image.imageProps} />
    </div>
  );
}

export function Hero({ variant, theme, heading, image, links }: IHeroProps) {
  const backdropTone = resolveBackdropTone(theme);
  const hasImage = typeof image?.data?.src === "string" && image.data.src.length > 0;

  if (variant === "centered") {
    return (
      <>
        <AbstractBackdrop variant="blobs" tone={backdropTone} />
        <GridLines tone={backdropTone} />
        <div className="relative z-1 mx-auto flex max-w-[840px] flex-col items-center gap-6 text-center">
          <SectionHeading
            {...heading}
            as="h1"
            align="center"
            size="display-1"
            className="max-w-[840px] gap-6"
          />
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
          hasImage && "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"
        )}
      >
        <div className="flex max-w-[620px] flex-col gap-6">
          <SectionHeading {...heading} as="h1" size="display-1" className="gap-6" />
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

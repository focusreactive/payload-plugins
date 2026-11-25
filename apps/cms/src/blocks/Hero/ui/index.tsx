import { cn } from "@/components/utils";
import { GlowBackdrop } from "@/components/GlowBackdrop";
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
    <ul className={cn("flex flex-wrap items-center gap-x-8 gap-y-4", className)}>
      {links.map((link, i) => (
        <li key={i}>
          <Link {...link} />
        </li>
      ))}
    </ul>
  );
}

/** Full-bleed hero artwork with the plum soft-light wash and bottom highlight from the design. */
function HeroBackground({ image }: { image: PreparedMedia }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-1">
      <Media
        {...image.data}
        visualEditing={image.visualEditing}
        className="absolute inset-0"
        imageProps={{
          ...image.imageProps,
          aspectRatio: undefined,
          className: "object-cover",
          fill: true,
          priority: true,
          sizes: "100vw",
        }}
        videoProps={{ className: "size-full object-cover" }}
      />
      <div className="absolute inset-0 bg-plum-50 mix-blend-soft-light" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white-10" />
    </div>
  );
}

export function Hero({ variant, heading, image, links }: IHeroProps) {
  const hasImage = typeof image?.data?.src === "string" && image.data.src.length > 0;
  const isCentered = variant === "centered";

  return (
    <>
      {isCentered || !hasImage ? (
        <GlowBackdrop placement="center" className="top-full opacity-80" />
      ) : (
        <HeroBackground image={image} />
      )}

      <div className="grid w-full grid-cols-1 gap-gridGap lg:grid-cols-12">
        <div
          className={cn(
            "flex flex-col gap-12 md:gap-20",
            isCentered
              ? "items-center text-center lg:col-span-8 lg:col-start-3"
              : "items-start lg:col-span-7"
          )}
        >
          <SectionHeading
            {...heading}
            as="h1"
            align={isCentered ? "center" : "left"}
            size="display-1"
            className={cn("gap-8", !isCentered && "[&>p:last-child]:max-w-[75%]")}
          />
          <HeroActions links={links} className={cn(isCentered && "justify-center")} />
        </div>
      </div>
    </>
  );
}

import { cn } from "@/components/utils";
import { Media } from "@/components/media";
import type { PreparedMedia } from "@/components/media";
import { RichText } from "@/components/richText";
import { Badge } from "@/shared/ui/shadcn/base/badges/badges";
import { Button } from "@/shared/ui/shadcn/base/buttons/button";
import { BackgroundStripes } from "@/shared/ui/shadcn/marketing/header-section/base-components/background-stripes";
import type { IHeroProps } from "./types";

/**
 * Untitled UI frames the screenshot rather than letting it float: ring + shadow + a fixed 3/2 crop
 * anchored to the top of the image. object-top matters for a CMS screenshot - the toolbar and the
 * first rows are the part worth seeing, so a centred crop would cut exactly the wrong half.
 */
function HeroMockup({ image }: { image: PreparedMedia }) {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <Media
        {...image.data}
        visualEditing={image.visualEditing}
        imageProps={{
          ...image.imageProps,
          className: cn(
            image.imageProps?.className,
            "mx-auto aspect-3/2 max-w-full rounded object-cover object-top shadow-xl ring-4 ring-screen-mockup-border md:rounded-xl md:shadow-3xl md:ring-6"
          ),
        }}
      />
    </div>
  );
}

/**
 * Untitled UI's marketing/header-section/hero-abstract-angles-03: centred copy, then the product
 * shot full width underneath. Dropped from the source: its <HeaderPrimary/> (our nav is CMS-driven
 * and lives in the layout, not the block) and the light/dark <img> pair (Media already resolves one
 * source). Everything else - the badge, the type scale, BackgroundStripes and the framed mockup -
 * is theirs unchanged.
 */
export function Hero({ badge, title, text, image, links }: IHeroProps) {
  const hasImage = typeof image?.data?.src === "string" && image.data.src.length > 0;

  return (
    <section>
      <div className="flex flex-col items-center bg-utility-brand-50_alt pt-16 md:pt-24">
        <div className="mx-auto flex w-full max-w-container flex-col px-4 md:px-8">
          <div className="flex flex-col items-start sm:items-center sm:text-center">
            {badge && (
              <Badge size="lg" type="pill-color" color="brand">
                {badge}
              </Badge>
            )}

            <h1 className="mt-4 text-display-md font-semibold text-brand-primary md:text-display-lg lg:text-display-xl">
              {title}
            </h1>

            <RichText
              {...text}
              className="mt-4 max-w-3xl text-lg text-brand-secondary md:mt-6 md:text-xl"
            />

            {links?.length > 0 && (
              <div className="relative z-1 mt-8 flex w-full flex-col-reverse items-stretch gap-3 sm:w-auto sm:flex-row sm:items-start md:mt-12">
                {links.map((link, index) => (
                  <Button
                    key={index}
                    href={link.href}
                    size="xl"
                    color={index === 0 ? "secondary" : "primary"}
                  >
                    {link.text}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative pt-16">
        <BackgroundStripes />
      </div>

      {hasImage && (
        <div className="relative pb-16 md:pb-24">
          <div className="mx-auto w-full max-w-container px-4 md:px-8">
            <HeroMockup image={image} />
          </div>
        </div>
      )}
    </section>
  );
}

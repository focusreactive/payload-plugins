import { cn } from "@/components/utils";
import { Media } from "@/components/media";
import type { PreparedMedia } from "@/components/media";
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

            {/*
              Not <RichText {...text} .../> here: that component (components/richText) wraps its
              children in its own "prose max-w-full" div, but text.richText already arrives
              pre-wrapped in one from components/shared/RichText's own rendering - nesting two
              .prose containers. This renders the already-wrapped node directly, keeping exactly
              one .prose layer.
            */}
            <div className="mt-4 max-w-3xl text-lg text-brand-secondary md:mt-6 md:text-xl">
              {text.richText}
            </div>

            {links?.length > 0 && (
              <div className="relative z-1 mt-8 flex w-full flex-col-reverse items-stretch gap-3 sm:w-auto sm:flex-row sm:items-start md:mt-12">
                {links.map((link, index) => (
                  <Button
                    key={index}
                    href={link.href}
                    size="xl"
                    // Untitled UI's source puts secondary first because its own first action is a
                    // "Demo" link. Ours leads with the primary call, so the order is reversed.
                    color={index === 0 ? "primary" : "secondary"}
                    // The "secondary" color's `bg-primary text-secondary ring-primary` is generated
                    // twice, once per Tailwind entry point (globals.css vs this app's own
                    // app/(frontend)/styles.css, which imports @repo/tailwind-config/base.css and
                    // never sees theme.css's Untitled overrides), and the second, later-loaded
                    // stylesheet wins the cascade - so this button rendered DESIGN.md's own
                    // near-black `--color-secondary` on its own dark green `--color-primary`
                    // instead of Untitled's white/grey outline button. See brand.css for the
                    // cta-outline tokens this points at instead.
                    className={
                      index !== 0
                        ? "bg-cta-outline text-cta-outline-foreground ring-cta-outline-border"
                        : undefined
                    }
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

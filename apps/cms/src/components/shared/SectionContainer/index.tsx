import { cva } from "class-variance-authority";

import { cn } from "@/components/utils";
import { GlowBackdrop } from "@/components/GlowBackdrop";
import { Media } from "@/components/media";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";

import { Container } from "../Container";
import type { ISectionContainerProps, ISectionData } from "./types";

type SectionTheme = ISectionData["theme"];

const GLASS_THEMES = new Set<SectionTheme>(["light-gray", "dark-gray"]);

/** Glass themes render the section as a rounded, blurred panel. */
export function isGlassTheme(theme: SectionTheme): boolean {
  return GLASS_THEMES.has(theme);
}

/** Only the "glass + glow" theme paints the striped glow behind its top edge. */
export function hasSeamGlow(theme: SectionTheme): boolean {
  return theme === "dark-gray";
}

export const sectionVariants = cva("relative", {
  defaultVariants: {
    density: "base",
    paddingY: "base",
  },
  variants: {
    density: { base: "", compact: "" },
    paddingY: { base: "", large: "py-sectionLarge", none: "py-0" },
  },
  compoundVariants: [
    { density: "base", paddingY: "base", className: "pt-sectionTop pb-sectionBottom" },
    {
      density: "compact",
      paddingY: "base",
      className: "pt-sectionTopCompact pb-sectionBottomCompact",
    },
  ],
});

const panelVariants = cva("relative", {
  defaultVariants: { surface: "base" },
  variants: {
    surface: {
      base: "",
      ink: "bg-background text-foreground",
      glass:
        "rounded-2xl border-y border-border bg-background text-foreground backdrop-blur-glass-lg",
    },
  },
});

function resolveSurface(theme: SectionTheme): "base" | "ink" | "glass" {
  if (isGlassTheme(theme)) return "glass";
  if (theme === "dark") return "ink";
  return "base";
}

export function SectionContainer({
  children,
  className,
  containerClassName,
  sectionData,
}: ISectionContainerProps) {
  const { id, theme, paddingY, background } = sectionData;
  const { media, overlay, opacity } = background ?? {};

  const overlayOpacity = opacity != null ? opacity / 100 : undefined;
  const resolvedMedia = media && typeof media === "object" ? media : null;
  const preparedMedia = resolvedMedia ? prepareMediaProps({ image: resolvedMedia }) : null;
  const surface = resolveSurface(theme);

  return (
    <section id={id ?? undefined} className="relative" {...(theme ? { "data-theme": theme } : {})}>
      {hasSeamGlow(theme) && <GlowBackdrop placement="seam" />}

      <div
        className={cn(
          panelVariants({ surface }),
          sectionVariants({ density: surface === "glass" ? "compact" : "base", paddingY }),
          preparedMedia && "overflow-clip",
          className
        )}
      >
        {preparedMedia && (
          <>
            <Media
              {...preparedMedia.data}
              className="absolute inset-0 size-full pointer-events-none"
              imageProps={{
                ...preparedMedia.imageProps,
                className: "size-full object-cover",
                fill: true,
                "aria-hidden": true,
              }}
              videoProps={{
                className: "size-full object-cover",
                "aria-hidden": true,
              }}
              visualEditing={preparedMedia.visualEditing}
            />

            {overlay && (
              <div
                aria-hidden
                className={cn(
                  "absolute inset-0 pointer-events-none",
                  overlay === "black" ? "bg-black" : "bg-white"
                )}
                style={{ opacity: overlayOpacity }}
              />
            )}
          </>
        )}

        <Container containerData={sectionData} className={cn("relative", containerClassName)}>
          {children}
        </Container>
      </div>
    </section>
  );
}

import { cva } from "class-variance-authority";

import { cn } from "@/components/utils";
import { Media } from "@/components/media";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";

import { Container } from "../Container";
import type { ISectionContainerProps } from "./types";

export const sectionVariants = cva("overflow-clip relative z-1", {
  defaultVariants: {
    paddingY: "base",
  },
  variants: {
    paddingY: {
      base: "py-sectionBase",
      large: "py-sectionLarge",
      none: "py-0",
    },
  },
});

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

  return (
    <section
      id={id ?? undefined}
      className={cn(
        sectionVariants({ paddingY }),
        theme && "bg-background text-foreground",
        "relative overflow-hidden",
        className
      )}
      {...(theme ? { "data-theme": theme } : {})}
    >
      <Container containerData={sectionData} className={containerClassName}>
        {children}
      </Container>

      {preparedMedia && (
        <>
          <Media
            {...preparedMedia.data}
            className="absolute inset-0 size-full -z-2 pointer-events-none"
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
              className="absolute inset-0 -z-1 pointer-events-none"
              style={{
                backgroundColor: `rgba(${overlay === "black" ? "0,0,0" : "255,255,255"},${overlayOpacity})`,
              }}
            />
          )}
        </>
      )}
    </section>
  );
}

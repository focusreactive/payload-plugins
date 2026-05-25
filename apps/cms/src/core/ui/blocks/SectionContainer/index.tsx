import { cva } from "class-variance-authority";

import { cn } from "@/core/lib/utils";

import { Container } from "../Container";
import { Media } from "../Media";
import type { ISectionContainerProps } from "./types";

const sectionVariants = cva("overflow-clip relative z-1", {
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
  const hasMedia = !!media;

  return (
    <section
      id={id ?? undefined}
      className={cn(sectionVariants({ paddingY }), className)}
      {...(theme ? { "data-theme": theme } : {})}
    >
      <Container containerData={sectionData} className={containerClassName}>
        {children}
      </Container>

      {hasMedia && (
        <>
          <Media
            resource={media}
            className="absolute inset-0 size-full -z-2 pointer-events-none"
            imgClassName="size-full object-cover "
            videoClassName="size-full object-cover "
            fill
            aria-hidden
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

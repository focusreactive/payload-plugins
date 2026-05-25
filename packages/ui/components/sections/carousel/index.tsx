"use client";

import React, { useEffect, useRef } from "react";
import { EffectCards, EffectCoverflow, EffectCube, EffectFade, EffectFlip, Navigation } from "swiper/modules";
import type { NavigationOptions } from "swiper/types";

import { cn } from "../../../utils";

import "swiper/css/bundle";

import { GenericCarousel } from "../../ui/GenericCarousel";
import type { IGenericCarouselBaseProps } from "../../ui/GenericCarousel/types";
import CarouselCard from "./CarouselCard";
import type { ICarouselProps } from "./types";

const getEffectModule = (effect: IGenericCarouselBaseProps["effect"]) => {
  switch (effect) {
    case "fade":
      return EffectFade;
    case "cube":
      return EffectCube;
    case "flip":
      return EffectFlip;
    case "coverflow":
      return EffectCoverflow;
    case "cards":
      return EffectCards;
    default:
      return;
  }
};

const NavButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { direction: "prev" | "next" }>(({ className, direction, ...props }, ref) => (
  <button
    ref={ref}
    aria-label={direction === "prev" ? "Previous slide" : "Next slide"}
    className={cn(
      "z-10 inline-flex size-12 items-center justify-center rounded-pill border border-foreground/20 bg-surface text-foreground transition-all hover:border-foreground hover:bg-foreground hover:text-background",
      className
    )}
    {...props}
  >
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={cn("size-5", direction === "next" && "rotate-180")}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  </button>
));
NavButton.displayName = "NavButton";

export function Carousel({ slides, customModules, customModulesParams, effect, params }: ICarouselProps) {
  const effectModule = getEffectModule(effect);

  const prevButtonRef = useRef<HTMLButtonElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const [navigation, setNavigation] = React.useState<NavigationOptions>({
    enabled: true,
    nextEl: nextButtonRef.current,
    prevEl: prevButtonRef.current,
  });

  useEffect(() => {
    if (prevButtonRef.current && nextButtonRef.current) {
      setNavigation({
        enabled: true,
        nextEl: nextButtonRef.current,
        prevEl: prevButtonRef.current,
      });
    }
  }, [prevButtonRef, nextButtonRef]);

  return (
    <div className="not-prose">
      <div className="mb-6 flex items-center justify-end gap-3 sm:mb-8">
        <NavButton ref={prevButtonRef} direction="prev" />
        <NavButton ref={nextButtonRef} direction="next" />
      </div>

      <GenericCarousel
        slides={
          slides.map((slide) => ({
            children: (({ isNext, isActive }: { isNext: boolean; isActive: boolean }) => (
              <CarouselCard {...slide} isActive={effect === "coverflow" ? isNext : isActive} />
            )) as unknown as React.ReactNode,
          })) as any
        }
        customModules={[Navigation, ...(customModules || []), ...(effectModule ? [effectModule] : [])]}
        customModulesParams={{ navigation, ...customModulesParams }}
        effect={effect}
        params={params}
      />
    </div>
  );
}

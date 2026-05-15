"use client";

import { useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";

import { cn } from "../../../utils";
import type { IGenericCarouselProps } from "./types";

const defaultEffectsConfig = {
  cardsEffect: {
    perSlideOffset: 8,
    perSlideRotate: 2,
    rotate: true,
    slideShadows: false,
  },
  coverflowEffect: {
    depth: 100,
    modifier: 1,
    rotate: 50,
    slideShadows: false,
    stretch: 0,
  },
  cubeEffect: {
    shadow: true,
    shadowOffset: 20,
    shadowScale: 0.94,
    slideShadows: false,
  },
  fadeEffect: {
    crossFade: false,
  },
  flipEffect: {
    limitRotation: true,
    slideShadows: false,
  },
};

export function GenericCarousel({
  slides,
  customModules,
  customModulesParams,
  effect,
  params,
}: IGenericCarouselProps) {
  // to trigger rerender in preview when changing effect
  useEffect(() => {
    console.log("effect changed");
  }, [effect]);

  return (
    <div className="relative mask-shadow-y">
      <Swiper
        modules={customModules || []}
        {...customModulesParams}
        effect={effect}
        slidesPerView="auto"
        {...params}
        {...defaultEffectsConfig}
        className={cn("!py-10", {
          "w-1/2": effect === "fade",
          "w-[500px] !pb-12 !pt-10":
            effect && ["cube", "flip", "cards"].includes(effect),
        })}
      >
        {(slides || []).map((slide, i) => (
            <SwiperSlide className={cn("!h-auto", slide.className)} key={i}>
              {slide.children}
            </SwiperSlide>
          ))}
      </Swiper>
    </div>
  );
}

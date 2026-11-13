"use client";

import useEmblaCarousel from "embla-carousel-react";
import React, { useEffect, useState } from "react";

export interface SlidesToShow {
  desktop: number;
  medium: number;
  small: number;
  mobile: number;
}

interface Props {
  /** The site's slider type, used as the class of every slide (`experts slide`). */
  type: string;
  slidesToShow: SlidesToShow;
  slidesToScroll?: number;
  className?: string;
  /** The last slide, which the site styles as a "see all" tile. */
  seeAll?: React.ReactNode;
  children: React.ReactNode;
}

// The attributes the site's stylesheet scopes its carousel rules to.
const SCOPE_SLIDER = { "data-v-3d1a4f76": "" };
const SCOPE_TRACK = { "data-v-e4caeaf8": "" };
const SCOPE_ARROW = { "data-v-21137603": "" };

/**
 * Embla with the element structure and class names the site's carousel CSS expects
 * (`slick-slider > slick-list > slick-track > slick-slide`, arrows and dots).
 */
export function SiteSlider({
  type,
  slidesToShow,
  slidesToScroll = 1,
  className = "slides",
  seeAll,
  children,
}: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    slidesToScroll,
  });
  const [selected, setSelected] = useState(0);
  const [snapCount, setSnapCount] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    const update = () => {
      setSelected(emblaApi.selectedScrollSnap());
      setSnapCount(emblaApi.scrollSnapList().length);
      setCanPrev(emblaApi.canScrollPrev());
      setCanNext(emblaApi.canScrollNext());
    };

    update();
    emblaApi.on("select", update);
    emblaApi.on("reInit", update);

    return () => {
      emblaApi.off("select", update);
      emblaApi.off("reInit", update);
    };
  }, [emblaApi]);

  const slides: { isSeeAll: boolean; slide: React.ReactNode }[] = React.Children.toArray(
    children
  ).map((slide) => ({ isSeeAll: false, slide }));

  if (seeAll) {
    slides.push({ isSeeAll: true, slide: seeAll });
  }
  const sliderStyle = {
    "--slides-desktop": slidesToShow.desktop,
    "--slides-medium": slidesToShow.medium,
    "--slides-mobile": slidesToShow.mobile,
    "--slides-small": slidesToShow.small,
  } as React.CSSProperties;

  return (
    <div className={className}>
      <div
        className="slick-slider slick-initialized site-slider"
        style={sliderStyle}
        {...SCOPE_SLIDER}
      >
        <button
          aria-label="Previous"
          className={`slick-arrow slick-prev${canPrev ? "" : " slick-disabled"}`}
          disabled={!canPrev}
          onClick={() => emblaApi?.scrollPrev()}
          type="button"
          {...SCOPE_ARROW}
        />
        <div className="slick-list" ref={emblaRef} {...SCOPE_SLIDER}>
          <div className="slick-track" {...SCOPE_TRACK}>
            {slides.map(({ slide, isSeeAll }, index) => (
              <div
                className={`slick-slide${index === selected ? " slick-active slick-current" : ""}`}
                data-index={index}
                key={index}
                {...SCOPE_TRACK}
              >
                <div>
                  <div className={isSeeAll ? `${type} see-all slide` : `${type} slide`}>
                    {slide}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <button
          aria-label="Next"
          className={`slick-arrow slick-next${canNext ? "" : " slick-disabled"}`}
          disabled={!canNext}
          onClick={() => emblaApi?.scrollNext()}
          type="button"
          {...SCOPE_ARROW}
        />
        {snapCount > 1 && (
          <ul className="slick-dots">
            {Array.from({ length: snapCount }, (_, index) => (
              <li className={index === selected ? "slick-active" : ""} key={index}>
                <button onClick={() => emblaApi?.scrollTo(index)} type="button">
                  {index + 1}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

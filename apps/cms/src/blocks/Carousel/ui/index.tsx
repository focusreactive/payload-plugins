"use client";

import React, { useEffect, useRef, useState } from "react";

import { cn } from "@/components/utils";
import { Media } from "@/components/media";
import { RichText } from "@/components/richText";
import { SliderNav } from "@/components/SliderNav";
import type { ICarouselProps } from "./types";

const AUTOPLAY_DELAY = 6500;

interface DotProps {
  index: number;
  isActive: boolean;
  total: number;
  onSelect: (index: number) => void;
}

function Dot({ index, isActive, total, onSelect }: DotProps) {
  return (
    <button
      type="button"
      aria-label={`Go to slide ${index + 1} of ${total}`}
      aria-current={isActive ? ("true" as const) : undefined}
      onClick={() => onSelect(index)}
      className={cn(
        "h-2 cursor-pointer rounded-pill border-none p-0",
        "transition-[width,background-color] duration-200 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        isActive ? "w-6 bg-primary" : "w-2 bg-border-strong hover:bg-white-40"
      )}
    />
  );
}

export function Carousel({ slides, effect }: ICarouselProps) {
  const [current, setCurrent] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const count = (slides ?? []).length;
  const isFade = effect === "fade";

  const goTo = (index: number) => {
    setCurrent(((index % count) + count) % count);
  };

  const goPrev = () => goTo(current - 1);
  const goNext = () => goTo(current + 1);

  useEffect(() => {
    if (count <= 1) return;
    if (isHovering || isFocused) return;

    const mq =
      typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    if (mq?.matches) return;

    const id = setInterval(() => {
      setCurrent((prev) => (prev + 1) % count);
    }, AUTOPLAY_DELAY);

    return () => clearInterval(id);
  }, [count, isHovering, isFocused]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goPrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goNext();
    }
  };

  if (!slides?.length) return null;

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
          setIsFocused(false);
        }
      }}
      onKeyDown={handleKeyDown}
      role="region"
      aria-roledescription="carousel"
      aria-label="Product tour"
    >
      <div className="grid grid-cols-1 overflow-clip rounded-2xl bg-surface p-2 md:min-h-[clamp(440px,41.7vw,600px)] md:grid-cols-2">
        <div className="relative grid aspect-[4/3] overflow-clip rounded-xl md:aspect-auto">
          {slides.map((slide, i) => {
            const isActive = i === current;
            const { image } = slide;

            return (
              <div
                key={i}
                aria-hidden={!isActive ? true : undefined}
                style={{
                  gridArea: "1 / 1",
                  transform: isFade ? undefined : `translateX(${(i - current) * 100}%)`,
                }}
                className={cn(
                  "relative size-full",
                  isFade
                    ? cn(
                        "transition-opacity duration-[600ms] ease-out",
                        isActive ? "opacity-100" : "pointer-events-none opacity-0"
                      )
                    : "transition-[transform] duration-[600ms] ease-out"
                )}
              >
                {image?.data?.src ? (
                  <Media
                    {...image.data}
                    className="absolute inset-0"
                    visualEditing={image.visualEditing}
                    imageProps={{
                      ...image.imageProps,
                      className: "object-cover",
                      fill: true,
                      priority: i === 0,
                      sizes: "(max-width: 768px) 100vw, 640px",
                    }}
                  />
                ) : (
                  <div className="size-full bg-surface-muted" />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-8 px-6 pt-10 pb-6 md:px-10 md:pt-14 md:pb-10 xl:px-24 xl:pt-24 xl:pb-12">
          <div className="grid flex-1" aria-live="polite" aria-atomic="true">
            {slides.map((slide, i) => {
              const isActive = i === current;

              return (
                <div
                  key={i}
                  aria-roledescription="slide"
                  aria-label={`Slide ${i + 1} of ${count}`}
                  aria-hidden={!isActive ? true : undefined}
                  inert={isActive ? undefined : true}
                  style={{ gridArea: "1 / 1" }}
                  className={cn(
                    "transition-opacity duration-[600ms] ease-out motion-reduce:transition-none",
                    isActive ? "opacity-100" : "pointer-events-none opacity-0"
                  )}
                >
                  {slide.text && <RichText {...slide.text} variant="card" />}
                </div>
              );
            })}
          </div>

          {count > 1 && (
            <div className="flex items-center justify-between gap-5">
              <SliderNav
                onPrev={goPrev}
                onNext={goNext}
                prevLabel="Previous slide"
                nextLabel="Next slide"
              />
              <div
                className="flex items-center gap-[9px]"
                role="tablist"
                aria-label="Slide indicators"
              >
                {slides.map((_, i) => (
                  <Dot key={i} index={i} isActive={i === current} total={count} onSelect={goTo} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

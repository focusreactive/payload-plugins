"use client";

import React, { useEffect, useRef, useState } from "react";

import { cn } from "@/components/utils";
import { Media } from "@/components/media";
import { RichText } from "@/components/richText";
import type { ICarouselProps } from "./types";

const AUTOPLAY_DELAY = 6500;

interface NavButtonProps {
  direction: "prev" | "next";
  onClick: () => void;
}

function NavButton({ direction, onClick }: NavButtonProps) {
  return (
    <button
      type="button"
      aria-label={direction === "prev" ? "Previous slide" : "Next slide"}
      onClick={onClick}
      className={cn(
        "inline-grid size-[46px] flex-none place-items-center rounded-pill",
        "border border-border-strong bg-surface text-foreground",
        "transition-colors duration-150 ease-out",
        "hover:border-foreground",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "active:scale-[0.93]"
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
        className={cn("size-[18px]", direction === "next" && "rotate-180")}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
      </svg>
    </button>
  );
}

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
        "h-[9px] cursor-pointer rounded-pill border-none p-0",
        "transition-[width,background-color] duration-200 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        isActive ? "w-[26px] bg-primary" : "w-[9px] bg-border-strong"
      )}
    />
  );
}

interface SlideContentProps {
  slide: ICarouselProps["slides"][number];
  index: number;
}

function SlideContent({ slide, index }: SlideContentProps) {
  const { image, text } = slide;

  return (
    <div className="grid min-h-[420px] grid-cols-1 md:grid-cols-[1.1fr_0.9fr]">
      <div className="relative overflow-hidden rounded-t-lg md:rounded-l-lg md:rounded-tr-none">
        {image?.data?.src ? (
          <Media
            {...image.data}
            visualEditing={image.visualEditing}
            imageProps={{
              ...image.imageProps,
              fill: true,
              priority: index === 0,
            }}
          />
        ) : (
          <div className="h-full min-h-[260px] w-full bg-surface-muted md:min-h-0" />
        )}
      </div>

      <div className="flex flex-col justify-center gap-4 rounded-b-lg bg-surface px-8 py-10 md:rounded-r-lg md:rounded-bl-none md:px-[clamp(2rem,4vw,3.5rem)] md:py-[clamp(2rem,5vw,3.5rem)]">
        {text && <RichText {...text} variant="card" />}
      </div>
    </div>
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
      <div
        className="relative grid overflow-hidden rounded-lg border border-border"
        aria-live="polite"
        aria-atomic="true"
      >
        {slides.map((slide, i) => {
          const isActive = i === current;
          const offsetPct = `${(i - current) * 100}%`;

          return (
            <div
              key={i}
              aria-roledescription="slide"
              aria-label={`Slide ${i + 1} of ${count}`}
              aria-hidden={!isActive ? true : undefined}
              style={{
                gridArea: "1 / 1",
                transform: isFade ? undefined : `translateX(${offsetPct})`,
              }}
              className={cn(
                isFade
                  ? cn(
                      "transition-opacity duration-[600ms] ease-out",
                      isActive ? "opacity-100" : "pointer-events-none opacity-0"
                    )
                  : cn(
                      "transition-[transform] duration-[600ms] ease-out",
                      !isActive && "pointer-events-none"
                    )
              )}
            >
              <SlideContent slide={slide} index={i} />
            </div>
          );
        })}
      </div>

      <div className="mt-[26px] flex items-center justify-between gap-5">
        <div className="flex items-center gap-[9px]" role="tablist" aria-label="Slide indicators">
          {slides.map((_, i) => (
            <Dot key={i} index={i} isActive={i === current} total={count} onSelect={goTo} />
          ))}
        </div>

        <div className="flex items-center gap-[10px]">
          <NavButton direction="prev" onClick={goPrev} />
          <NavButton direction="next" onClick={goNext} />
        </div>
      </div>
    </div>
  );
}

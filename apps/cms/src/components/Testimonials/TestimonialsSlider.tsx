"use client";

import React, { useEffect, useRef, useState } from "react";

import { SliderNav } from "@/components/SliderNav";

interface TestimonialsSliderProps {
  children: React.ReactNode;
  /** Seconds for one automatic pass through every card. 0 disables autoplay. */
  duration?: number;
}

const EDGE_TOLERANCE_PX = 4;

/**
 * Horizontal, snap-scrolling row of testimonial cards with the shared prev / next pill. The track
 * bleeds to the viewport edges while the first card stays on the content edge (100cqw = content width).
 */
export function TestimonialsSlider({ children, duration = 0 }: TestimonialsSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [paused, setPaused] = useState(false);
  const count = React.Children.count(children);

  const syncEdges = () => {
    const track = trackRef.current;
    if (!track) return;
    setAtStart(track.scrollLeft <= EDGE_TOLERANCE_PX);
    setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - EDGE_TOLERANCE_PX);
  };

  const scrollByCard = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>("[data-slide]");
    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
    const step = (card?.offsetWidth ?? track.clientWidth) + gap;
    track.scrollBy({ behavior: "smooth", left: direction * step });
  };

  useEffect(() => {
    syncEdges();
    window.addEventListener("resize", syncEdges);
    return () => window.removeEventListener("resize", syncEdges);
  }, []);

  useEffect(() => {
    if (!duration || count <= 1 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(
      () => {
        const track = trackRef.current;
        if (!track) return;
        const reachedEnd =
          track.scrollLeft + track.clientWidth >= track.scrollWidth - EDGE_TOLERANCE_PX;
        if (reachedEnd) {
          track.scrollTo({ behavior: "smooth", left: 0 });
        } else {
          scrollByCard(1);
        }
      },
      (duration * 1000) / count
    );

    return () => clearInterval(id);
  }, [duration, count, paused]);

  return (
    <div
      className="@container flex flex-col gap-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        onScroll={syncEdges}
        className="mx-[calc(50cqw-50vw)] flex snap-x snap-mandatory scroll-px-[calc(50vw-50cqw)] items-start gap-gridGap overflow-x-auto px-[calc(50vw-50cqw)] scrollbar-none"
      >
        {React.Children.map(children, (child, index) => (
          <div
            key={index}
            data-slide
            className="w-[min(85vw,440px)] shrink-0 snap-start lg:w-[calc((100%-2*var(--grid-gap))/2.75)] lg:min-w-[440px] lg:max-w-[520px]"
          >
            {child}
          </div>
        ))}
      </div>

      {count > 1 && (
        <SliderNav
          onPrev={() => scrollByCard(-1)}
          onNext={() => scrollByCard(1)}
          prevLabel="Previous testimonials"
          nextLabel="Next testimonials"
          prevDisabled={atStart}
          nextDisabled={atEnd}
        />
      )}
    </div>
  );
}

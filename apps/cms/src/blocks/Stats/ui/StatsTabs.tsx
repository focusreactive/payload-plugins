"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "@untitledui/icons";

import { AnimatedStatValue } from "@/components/demo/AnimatedStatValue";
import { cn } from "@/components/utils";
import { Button } from "@/shared/ui/shadcn/base/buttons/button";

import type { StatItem } from "./index";

const AUTOPLAY_DURATION_MILLISECONDS = 6000;

interface StatsTabsProps {
  items: StatItem[];
  /** One per item, in item order. An item without its own image repeats the block image. */
  images: React.ReactNode[];
}

/**
 * Untitled UI's features-tabs-mockup-05, with the figures as the tabs and one screenshot per
 * figure. The progress bar on the current tab is the autoplay timer: its animation finishing is
 * what advances to the next tab, so pausing the bar (pointer over the section, section off
 * screen) pauses the rotation with no second timer to keep in step. A click hands control to the
 * visitor and autoplay stops for good.
 */
export function StatsTabs({ items, images }: StatsTabsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoplaying, setIsAutoplaying] = useState(true);
  const [isInView, setIsInView] = useState(false);
  const [isPointerInside, setIsPointerInside] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressAnimationRef = useRef<Animation | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setIsAutoplaying(false);
  }, []);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setIsInView(entry.isIntersecting), {
      threshold: 0.4,
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const progressBar = progressBarRef.current;
    if (!isAutoplaying || !progressBar || items.length < 2) return;

    const animation = progressBar.animate(
      [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }],
      { duration: AUTOPLAY_DURATION_MILLISECONDS, easing: "linear", fill: "forwards" }
    );
    animation.pause();
    animation.onfinish = () => setCurrentIndex((index) => (index + 1) % items.length);
    progressAnimationRef.current = animation;
    return () => {
      animation.onfinish = null;
      animation.cancel();
      progressAnimationRef.current = null;
    };
  }, [currentIndex, isAutoplaying, items.length]);

  // Runs after the effect above has created this tab's animation, so it always has one to steer.
  useEffect(() => {
    const animation = progressAnimationRef.current;
    if (!animation) return;
    if (isInView && !isPointerInside) animation.play();
    else animation.pause();
  }, [currentIndex, isAutoplaying, isInView, isPointerInside]);

  function selectTab(index: number) {
    setIsAutoplaying(false);
    setCurrentIndex(index);
  }

  return (
    <div
      ref={sectionRef}
      className="grid grid-cols-1 gap-12 md:gap-16 lg:grid-cols-2 lg:items-center"
      onPointerEnter={() => setIsPointerInside(true)}
      onPointerLeave={() => setIsPointerInside(false)}
    >
      <ul className="flex flex-col" role="tablist" aria-orientation="vertical">
        {items.map((item, index) => {
          const isCurrent = index === currentIndex;
          return (
            <li
              key={index}
              className={cn(
                "relative flex cursor-pointer flex-col items-start gap-4 border-l-4 border-tertiary py-4 pl-5 transition duration-100 ease-linear hover:border-brand",
                isCurrent && !isAutoplaying && "border-brand"
              )}
              // The button's click bubbles here too; only the figure's own link is left alone.
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("a")) return;
                selectTab(index);
              }}
            >
              {isCurrent && isAutoplaying && (
                <div
                  ref={progressBarRef}
                  aria-hidden
                  className="absolute top-0 bottom-0 -left-1 w-1 origin-top scale-y-0 bg-fg-brand-primary_alt"
                />
              )}
              <button
                type="button"
                role="tab"
                aria-selected={isCurrent}
                aria-controls={`stats-tab-panel-${index}`}
                className="flex flex-col items-start text-left outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {/* Size and colour sit on separate elements: tailwind-merge reads the custom
                    text-display-* size as a colour and drops it when cn() sees both. */}
                <span className="text-display-md font-semibold">
                  <span
                    className={cn(
                      "transition-colors duration-300",
                      isCurrent ? "text-brand-tertiary_alt" : "text-quaternary"
                    )}
                  >
                    <AnimatedStatValue value={item.value} />
                  </span>
                </span>
                <span className="mt-1 text-lg font-semibold text-primary">{item.label}</span>
                {item.description && (
                  <span className="mt-1 text-md text-pretty text-tertiary">{item.description}</span>
                )}
              </button>
              {item.link && (
                <Button
                  color="link-color"
                  size="lg"
                  href={item.link.href}
                  iconTrailing={
                    <ArrowRight
                      data-icon="trailing"
                      className="pointer-events-none size-5 shrink-0 transition-inherit-all"
                    />
                  }
                >
                  {item.link.text}
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="-mx-4 flex items-center justify-center overflow-hidden bg-tertiary px-4 py-6 md:mx-0 md:py-10 lg:h-132 lg:py-12 lg:pl-12">
        {/* Every image stays mounted and stacked, so a tab change is a crossfade rather than a
            fresh load, and the next screenshot is already decoded when its turn comes. */}
        <div className="relative h-70 w-full md:h-110">
          {images.map((image, index) => (
            <div
              key={index}
              id={`stats-tab-panel-${index}`}
              role="tabpanel"
              aria-hidden={index !== currentIndex}
              className={cn(
                "absolute inset-0 overflow-hidden rounded-lg bg-white shadow-3xl ring-4 ring-screen-mockup-border transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none",
                index === currentIndex
                  ? "opacity-100"
                  : "pointer-events-none scale-[0.98] opacity-0"
              )}
            >
              {image}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

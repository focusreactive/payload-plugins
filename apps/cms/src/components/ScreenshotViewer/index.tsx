"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

interface ScreenshotViewerProps {
  children: React.ReactNode;
  /** Shown as the dialog's accessible name, and under the enlarged image. */
  caption?: string | null;
}

/**
 * Wraps a product screenshot with two behaviours the demo needs and the section library does not
 * ship: a slow pan so a dense admin UI is readable at section size, and click-to-enlarge so it can
 * be read properly.
 *
 * The pan only runs while the section is on screen. Running it off screen burns a compositor
 * layer on every section at once, and on a page with five screenshots that is visible as jank
 * when scrolling.
 */
export function ScreenshotViewer({ children, caption }: ScreenshotViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => setIsInView(entry.isIntersecting), {
      threshold: 0.25,
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Escape closes, and the body must not scroll behind the overlay.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const open = useCallback(() => setIsOpen(true), []);

  return (
    <>
      <div
        ref={containerRef}
        className="screenshot-viewer group relative size-full cursor-zoom-in overflow-hidden"
        data-panning={isInView ? "true" : undefined}
        onClick={open}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            open();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={caption ? `Enlarge: ${caption}` : "Enlarge screenshot"}
      >
        <div className="screenshot-viewer-pan size-full">{children}</div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-100 flex cursor-zoom-out flex-col items-center justify-center gap-4 bg-black/80 p-4 backdrop-blur-sm md:p-10"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={caption ?? "Screenshot"}
        >
          <div
            // An explicit height, because the child is a `fill` image: it positions against this
            // box, so max-h-full alone leaves it zero-high and only the caption renders.
            className="relative h-[80vh] w-full max-w-[1600px] overflow-hidden rounded-lg shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {children}
          </div>
          {caption && <p className="max-w-3xl text-center text-sm text-white/80">{caption}</p>}
        </div>
      )}
    </>
  );
}

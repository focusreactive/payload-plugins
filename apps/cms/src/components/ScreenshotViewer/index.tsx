"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { XClose } from "@untitledui/icons";

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
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.documentElement.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

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

      {isOpen &&
        // Portalled to body: a section ancestor with a transform turns `fixed` into
        // positioned-to-that-section, which clipped the overlay. z-90 sits under the sticky
        // header (z-100) so the site chrome stays visible while the image is open.
        createPortal(
          <div
            className="fixed inset-0 z-90 flex cursor-zoom-out flex-col items-center justify-center gap-4 bg-black/80 px-4 pt-24 pb-6 backdrop-blur-sm md:px-10 md:pb-10"
            onClick={close}
            role="dialog"
            aria-modal="true"
            aria-label={caption ?? "Screenshot"}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute top-24 right-4 z-1 flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20 md:right-8"
            >
              <XClose className="size-5" />
            </button>
            <div
              // An explicit height, because the child is a `fill` image: it positions against this
              // box, so max-h-full alone leaves it zero-high and only the caption renders.
              className="relative h-[calc(100vh-11rem)] w-full max-w-[1600px] overflow-hidden rounded-lg bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              {children}
            </div>
            {caption && <p className="max-w-3xl text-center text-sm text-white/80">{caption}</p>}
          </div>,
          document.body
        )}
    </>
  );
}

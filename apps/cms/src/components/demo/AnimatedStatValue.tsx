"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts a stat up when it scrolls into view. Written rather than pulled from motion-primitives
 * because that package brings framer-motion in for this one effect, and the whole behaviour is
 * one rAF loop.
 *
 * Values arrive as display strings ("3,115", "20"), so the numeric part is animated and whatever
 * surrounds it is preserved verbatim. A value with no digits renders untouched.
 */
export function AnimatedStatValue({ value }: { value: string }) {
  const match = value.match(/^(\D*)([\d,.\s]+)(.*)$/u);
  const target = match ? Number(match[2].replace(/[^\d]/gu, "")) : NaN;
  const usesGrouping = match ? /,/u.test(match[2]) : false;

  const elementRef = useRef<HTMLSpanElement>(null);
  const [displayed, setDisplayed] = useState(0);
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !Number.isFinite(target) || hasRun) return;

    // Anyone who asked for reduced motion gets the final number immediately.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayed(target);
      setHasRun(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        observer.disconnect();
        setHasRun(true);

        const durationMs = 1100;
        let startTimestamp: number | null = null;
        const step = (timestamp: number) => {
          startTimestamp ??= timestamp;
          const progress = Math.min((timestamp - startTimestamp) / durationMs, 1);
          // easeOutExpo: fast start, long settle, so the final digits are readable.
          const eased = progress === 1 ? 1 : 1 - 2 ** (-10 * progress);
          setDisplayed(Math.round(target * eased));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.4 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [target, hasRun]);

  if (!match || !Number.isFinite(target)) return <>{value}</>;

  const rendered = usesGrouping ? displayed.toLocaleString("en-US") : String(displayed);
  return (
    <span ref={elementRef}>
      {match[1]}
      {rendered}
      {match[3]}
    </span>
  );
}

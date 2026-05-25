import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import { clamp } from "./clamp";
import { measureLineRects } from "./measureLineRects";

const SPEED = 20;

export function useStrikethroughAnimation(isResolved: boolean, contentRect: RefObject<HTMLElement | null>) {
  const [lineRects, setLineRects] = useState<DOMRect[]>([]);
  const [lineContentRect, setLineContentRect] = useState<DOMRect | null>(null);

  const progressRef = useRef<number>(0);
  const directionRef = useRef<1 | -1>(1);
  const animationIdRef = useRef<number>(0);

  const measuredRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(false);

  const lineRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const lineRectsRef = useRef<DOMRect[]>([]);
  const cumulativePixelStartPerLineRef = useRef<number[]>([]);

  const getLineByIndexRef = (i: number) => (el: HTMLSpanElement | null) => {
    lineRefs.current[i] = el;
  };

  const getTotalLineWidth = () => {
    return lineRectsRef.current.reduce((sum, r) => sum + r.width, 0) || 1;
  };

  const measureLines = () => {
    const el = contentRect.current;
    if (!el) return;

    const lineRects = measureLineRects(contentRect);
    const lineContentRect = el.getBoundingClientRect();

    const precomputeCumulativePixelStartPerLine = () => {
      let acc = 0;

      return lineRects.map((rect) => {
        const start = acc;
        acc += rect.width;
        return start;
      });
    };

    lineRectsRef.current = lineRects;
    cumulativePixelStartPerLineRef.current = precomputeCumulativePixelStartPerLine();

    setLineRects(lineRects);
    setLineContentRect(lineContentRect);
  };

  const updateLines = (progress: number) => {
    const rects = lineRectsRef.current;
    const starts = cumulativePixelStartPerLineRef.current;

    lineRefs.current.forEach((line, i) => {
      if (!line || !rects[i]) return;

      const pixelStart = starts[i] ?? 0;
      const width = rects[i].width;

      const currentWidth = clamp(0, (progress - pixelStart) / width, 1) * width;
      line.style.width = `${currentWidth}px`;
    });
  };

  const startLoop = (n: number) => {
    cancelAnimationFrame(animationIdRef.current);

    const tick = () => {
      const direction = directionRef.current;
      progressRef.current = clamp(0, progressRef.current + direction * SPEED, n);
      updateLines(progressRef.current);

      const done = (direction === 1 && progressRef.current >= n) || (direction === -1 && progressRef.current <= 0);

      if (!done) {
        animationIdRef.current = requestAnimationFrame(tick);
      }
    };

    animationIdRef.current = requestAnimationFrame(tick);
  };

  useLayoutEffect(() => {
    updateLines(progressRef.current);
  }, [lineRects]);

  useEffect(() => {
    const isFirstRun = !mountedRef.current;
    mountedRef.current = true;

    const prefersReducedMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (isResolved && !measuredRef.current) {
      measureLines();
      measuredRef.current = true;
    }

    const totalWidth = getTotalLineWidth();
    directionRef.current = isResolved ? 1 : -1;

    cancelAnimationFrame(animationIdRef.current);

    if (isFirstRun && isResolved) {
      progressRef.current = totalWidth;

      return;
    }

    if (isFirstRun) return;

    if (prefersReducedMotion) {
      const targetProgress = isResolved ? totalWidth : 0;

      progressRef.current = targetProgress;
      updateLines(targetProgress);

      return;
    }

    startLoop(totalWidth);
  }, [isResolved]);

  useEffect(() => {
    const el = contentRect.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      if (!measuredRef.current) return;

      measureLines();

      const totalWidth = getTotalLineWidth();

      if (directionRef.current === 1 && progressRef.current >= totalWidth) {
        progressRef.current = totalWidth;
        updateLines(totalWidth);
      }
    });

    observer.observe(el);

    return () => observer.disconnect();
  }, [contentRect]);

  useEffect(() => {
    return () => cancelAnimationFrame(animationIdRef.current);
  }, []);

  return { lineRects, lineContentRect, getLineByIndexRef };
}

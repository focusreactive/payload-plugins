"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";

/**
 * The concept's entrance animation, ported from a `setInterval(200ms)` sweep over
 * `document.querySelectorAll("[data-reveal]")` (`07-footer.html:177-230`) to one IntersectionObserver
 * per element. The sweep was an artefact of the export tool's runtime, not a design decision - the
 * numbers below (the 50ms base, the 0.72s transition, the 44px offset, the 92%-of-viewport trigger
 * line) are reproduced exactly; only the trigger mechanism changed.
 */
const BASE_REVEAL_DELAY_MS = 50;
const REVEAL_TRANSITION_DURATION_MS = 720;
const REVEAL_EASING = "cubic-bezier(.22,.61,.36,1)";
const REVEAL_OFFSET_PX = 44;

/** `data-reveal-immediate`'s unconditional reveal time, bypassing the gate and the viewport check entirely. */
const IMMEDIATE_REVEAL_DELAY_MS = 140;

/**
 * Shrinks the observed root by 8% from the bottom, so an element intersects once its top has
 * scrolled above the 92%-of-viewport-height line - the concept's `rect.top < innerHeight * 0.92`.
 */
const VIEWPORT_TRIGGER_ROOT_MARGIN = "0px 0px -8% 0px";

/**
 * The concept's gate: nothing reveals until the page has finished loading and is tall enough to
 * actually scroll, so a still-loading or short page doesn't fire every section at once. Ported
 * per-hook rather than as one page-wide timer - see the retry loop below for why that also closes
 * off the "late-mounted element stuck invisible" risk instead of just reproducing the original.
 */
const GATE_TIMEOUT_MS = 6000;
const GATE_RETRY_INTERVAL_MS = 200;

export interface UseScrollRevealOptions {
  /** Extra delay in milliseconds, on top of the fixed 50ms base. Matches `data-reveal-delay`. */
  delay?: number;
  /** Reveals unconditionally ~140ms after mount, skipping the gate and the viewport check. Matches `data-reveal-immediate`. */
  immediate?: boolean;
  /** Position of this element within a `data-reveal-stagger` group, added to `delay` as `staggerIndex * staggerStepMs`. */
  staggerIndex?: number;
  /** The stagger group's per-item step in milliseconds. Matches `data-reveal-stagger="<step>"`. */
  staggerStepMs?: number;
  /**
   * A transition the caller already has on this element (for example a hover-state
   * `transition-colors`), appended after the reveal transition - the concept appends any
   * pre-existing `style.transition` the same way.
   */
  transition?: string;
}

export interface UseScrollRevealResult<T extends HTMLElement> {
  ref: RefObject<T | null>;
  style: CSSProperties;
}

/**
 * The concept's `delay = 50 + (data-reveal-delay || 0)`, then `delay += staggerIndex * step` for an
 * element inside a `data-reveal-stagger` group. Exported standalone so it can be verified against
 * the concept's own numbers without mounting a component.
 */
export function computeRevealDelayMs(delayMs = 0, staggerIndex = 0, staggerStepMs = 0): number {
  return BASE_REVEAL_DELAY_MS + delayMs + staggerIndex * staggerStepMs;
}

/** `useLayoutEffect` on the client, `useEffect` (a no-op during SSR) on the server - avoids React's SSR warning. */
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Drives one element's scroll-reveal state. The single most important decision here is what
 * happens before this hook has ever run: `hasMounted` starts `false`, and while it is `false` the
 * returned style is `{}` - the element renders exactly as the caller authored it, with no opacity
 * or transform override. That is what keeps content visible to a browser with JavaScript disabled
 * and to a crawler that never executes the mount effect, since the server-rendered HTML (and the
 * first client render, which must match it) never carries a hidden state at all. Only after
 * mounting does the layout effect flip `hasMounted` (synchronously, before the browser paints, so a
 * JS-enabled visitor never sees a flash of visible content) and the hidden starting style applies,
 * for the IntersectionObserver below to then animate away.
 *
 * `prefers-reduced-motion: reduce` is treated the same way as "not yet mounted": the style stays
 * `{}` forever, so the element is simply always visible, with no transform and no transition ever
 * applied. The concept has no such guard; skipping the animation entirely for this is the addition.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollRevealOptions = {}
): UseScrollRevealResult<T> {
  const { delay = 0, immediate = false, staggerIndex = 0, staggerStepMs = 0, transition } = options;

  const ref = useRef<T>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  useIsomorphicLayoutEffect(() => {
    setHasMounted(true);
    setPrefersReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (!hasMounted || prefersReducedMotion || isRevealed) return undefined;
    const element = ref.current;
    if (!element) return undefined;

    if (immediate) {
      const timeoutId = window.setTimeout(() => setIsRevealed(true), IMMEDIATE_REVEAL_DELAY_MS);
      return () => window.clearTimeout(timeoutId);
    }

    const mountedAt = Date.now();
    let gateRetryTimeoutId: number | undefined;

    const isPageSettled = () =>
      document.readyState === "complete" &&
      document.documentElement.scrollHeight > window.innerHeight * 1.5;

    // Runs once the element is known to be in (or past) its trigger position. If the page isn't
    // settled yet, it retries instead of revealing - except once `GATE_TIMEOUT_MS` has passed since
    // this element mounted, at which point it reveals regardless. Because that deadline is
    // per-mount rather than a single page-wide clock, an element mounted later by a filter
    // re-render gets its own fresh deadline instead of inheriting one that already expired -
    // exactly what keeps a late-mounted card from being stuck invisible.
    const revealWhenSettled = () => {
      if (isPageSettled() || Date.now() - mountedAt >= GATE_TIMEOUT_MS) {
        setIsRevealed(true);
        return;
      }
      gateRetryTimeoutId = window.setTimeout(revealWhenSettled, GATE_RETRY_INTERVAL_MS);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        // `boundingClientRect` is read directly, rather than trusting only `isIntersecting`, so an
        // element already scrolled past above the viewport at observe-time reveals too - the
        // concept's `rect.bottom <= 0` catch-all (in practice already implied by the root margin
        // below, kept explicit because the concept calls it out as its own case).
        if (entry.isIntersecting || entry.boundingClientRect.bottom <= 0) {
          revealWhenSettled();
        }
      },
      { rootMargin: VIEWPORT_TRIGGER_ROOT_MARGIN }
    );
    observer.observe(element);

    // The concept's other catch-all: a final section whose top can never cross the 92% line because
    // the page has no more room left to scroll past it.
    const revealIfScrolledToBottom = () => {
      const documentElement = document.documentElement;
      const scrollPosition = window.scrollY || documentElement.scrollTop || 0;
      const isAtBottom =
        scrollPosition > 0 &&
        documentElement.scrollHeight > window.innerHeight + 40 &&
        window.innerHeight + scrollPosition >= documentElement.scrollHeight - 4;
      if (isAtBottom) revealWhenSettled();
    };
    window.addEventListener("scroll", revealIfScrolledToBottom, {
      passive: true,
    });
    window.addEventListener("resize", revealIfScrolledToBottom);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", revealIfScrolledToBottom);
      window.removeEventListener("resize", revealIfScrolledToBottom);
      if (gateRetryTimeoutId !== undefined) window.clearTimeout(gateRetryTimeoutId);
    };
  }, [hasMounted, prefersReducedMotion, isRevealed, immediate]);

  if (!hasMounted || prefersReducedMotion) {
    return { ref, style: {} };
  }

  const delayMs = computeRevealDelayMs(delay, staggerIndex, staggerStepMs);
  const revealTransition = `opacity ${REVEAL_TRANSITION_DURATION_MS}ms ${REVEAL_EASING} ${delayMs}ms, transform ${REVEAL_TRANSITION_DURATION_MS}ms ${REVEAL_EASING} ${delayMs}ms`;

  return {
    ref,
    style: {
      opacity: isRevealed ? 1 : 0,
      transform: isRevealed ? "none" : `translateY(${REVEAL_OFFSET_PX}px)`,
      transition: transition ? `${revealTransition}, ${transition}` : revealTransition,
      willChange: "opacity, transform",
    },
  };
}

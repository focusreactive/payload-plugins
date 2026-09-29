"use client";

import { Children, isValidElement } from "react";
import type { CSSProperties, ElementType, ReactNode } from "react";

import { cn } from "@/components/utils";

import { useScrollReveal } from "./useScrollReveal";

export interface ScrollRevealProps {
  /** The wrapper tag. Defaults to `"div"` - swap it when the reveal sits inside a `<ul>` (`"li"`), for example. */
  as?: ElementType;
  children: ReactNode;
  className?: string;
  /** Extra delay in milliseconds, on top of the fixed 50ms base. Matches `data-reveal-delay`. */
  delay?: number;
  /** Reveals unconditionally ~140ms after mount, ignoring scroll position and the page-readiness gate. Matches `data-reveal-immediate`. */
  immediate?: boolean;
  style?: CSSProperties;
  /**
   * When set, `children` is treated as a list and each top-level child gets its own reveal, staggered
   * by index at this many milliseconds apart - the concept's `data-reveal-stagger="<step>"` on a
   * shared ancestor. Omit it to reveal all of `children` together as a single unit.
   */
  stagger?: number;
}

interface ScrollRevealItemProps {
  as: ElementType;
  children: ReactNode;
  className?: string;
  delay: number;
  immediate: boolean;
  staggerIndex: number;
  staggerStepMs: number;
  style?: CSSProperties;
}

function ScrollRevealItem({
  as,
  children,
  className,
  delay,
  immediate,
  staggerIndex,
  staggerStepMs,
  style,
}: ScrollRevealItemProps) {
  const { ref, style: revealStyle } = useScrollReveal<HTMLElement>({
    delay,
    immediate,
    staggerIndex,
    staggerStepMs,
    transition: typeof style?.transition === "string" ? style.transition : undefined,
  });

  // A dynamic element type and a fixed HTMLElement ref don't share one JSX call signature - the
  // same escape hatch `Button`'s asChild/Slot swap uses, for the same reason.
  const Element = as as any;

  return (
    <Element className={cn(className)} ref={ref} style={{ ...style, ...revealStyle }}>
      {children}
    </Element>
  );
}

/**
 * The concept's scroll-reveal entrance (`07-footer.html:177-230`, ported to IntersectionObserver -
 * see `useScrollReveal`'s doc comment for the full reasoning) as a declarative wrapper, for call
 * sites that would rather not touch the hook directly.
 *
 * Two shapes, both driven by the same `stagger` prop:
 *
 * - Without it, `children` reveals together as one unit - wrap a single element, or a handful the
 *   concept reveals as one group (a hero's lead paragraph and its button, for example).
 * - With it, `children` is read as a list (`Children.toArray`) and each top-level child gets its own
 *   independent reveal, offset by `index * stagger` milliseconds - for a list of children a caller
 *   doesn't own the internals of (a CMS-driven repeater, say) and so can't add the hook to directly.
 *   Each item still gets its own wrapper element for this, which is why a caller that DOES own the
 *   repeated component (and can add `useScrollReveal` to it directly, merging its own ref and style)
 *   should prefer that - it avoids the extra element, and it keeps something like a
 *   `scroll-snap-align` on the actual scrolling flex item rather than moving it onto a wrapper.
 */
export function ScrollReveal({
  as = "div",
  children,
  className,
  delay = 0,
  immediate = false,
  stagger,
  style,
}: ScrollRevealProps) {
  if (stagger) {
    const items = Children.toArray(children);

    return (
      <>
        {items.map((child, index) => (
          <ScrollRevealItem
            as={as}
            className={className}
            delay={delay}
            immediate={immediate}
            key={isValidElement(child) && child.key != null ? child.key : index}
            staggerIndex={index}
            staggerStepMs={stagger}
            style={style}
          >
            {child}
          </ScrollRevealItem>
        ))}
      </>
    );
  }

  return (
    <ScrollRevealItem
      as={as}
      className={className}
      delay={delay}
      immediate={immediate}
      staggerIndex={0}
      staggerStepMs={0}
      style={style}
    >
      {children}
    </ScrollRevealItem>
  );
}

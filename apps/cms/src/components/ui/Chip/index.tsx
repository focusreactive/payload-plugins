import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/components/utils";

export interface ChipProps {
  children: ReactNode;
  isActive?: boolean;
  /** Renders an `<a>` (next/link) that navigates - what today's TopicChips block and the blog's own FilterChip do. */
  href?: string;
  /** Renders a `<button type="button">` that flips state without navigating - the concept's own topic filter. */
  onClick?: () => void;
  className?: string;
}

const BASE_CLASSES =
  "inline-flex h-control flex-none items-center whitespace-nowrap rounded-lg border px-[clamp(12px,1.3vw,20px)] text-eyebrow";

/**
 * Deliberately narrower than `buttonVariants`' five-property, .25s transition: the concept animates
 * only a chip's fill flipping black/white on click, never its border or a shadow, so the longer list
 * would be transitioning properties that never change here.
 */
const TRANSITION_CLASSES =
  "transition-[background-color,color] duration-[200ms] ease-[ease] motion-reduce:transition-none";

function stateClasses(isActive: boolean | undefined) {
  return isActive
    ? "border-foreground bg-foreground text-background"
    : // The concept's own hover fill (#EEF5F0) is shared by both states, which turns the active black
      // chip mint on hover while its text stays white - illegible. Gating the hover to the inactive
      // state is the fix, not a reproduction of that bug.
      "border-border bg-background text-foreground hover:bg-primary-soft";
}

/** A filter chip: a client-state toggle (`onClick`), a navigating link (`href`), or a static label (neither). */
export function Chip({ children, isActive, href, onClick, className }: ChipProps) {
  if (href) {
    return (
      <Link
        aria-current={isActive ? "true" : undefined}
        className={cn(BASE_CLASSES, TRANSITION_CLASSES, stateClasses(isActive), className)}
        href={href}
      >
        {children}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        aria-pressed={isActive}
        className={cn(
          BASE_CLASSES,
          TRANSITION_CLASSES,
          stateClasses(isActive),
          "cursor-pointer",
          className
        )}
        onClick={onClick}
        type="button"
      >
        {children}
      </button>
    );
  }

  return (
    <span className={cn(BASE_CLASSES, TRANSITION_CLASSES, stateClasses(isActive), className)}>
      {children}
    </span>
  );
}

export interface ChipRowProps {
  children: ReactNode;
  className?: string;
}

/**
 * The concept's own single-line row - `overflow:hidden`, `flex-wrap:nowrap`, chips at 10px gap
 * (03-guidance-rail.html:10) - and nothing else. Deciding how many chips fit needs the row's live
 * width, a ResizeObserver and a re-render (`measureChips()`, 07-footer.html:265-283), plus an
 * "All topics" escape hatch for whatever got hidden - all client state, so all of it belongs in the
 * rail block that consumes this, not in this primitive.
 */
export function ChipRow({ children, className }: ChipRowProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-nowrap items-center gap-2.5 overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
}

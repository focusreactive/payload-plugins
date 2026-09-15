"use client";

/**
 * The course rail: a header, a row of topic chips and controls, and a horizontally scrolling row of
 * course cards.
 *
 * Why the whole section is a client module rather than only the interactive pieces: the two arrows
 * move the rail with `scrollBy`-style scrolling, which nothing in HTML can do, and a "filter" topic
 * chip narrows the rail in memory with no navigation at all, which needs `onClick` and state. The
 * cards themselves are still in the server-rendered HTML, because Next renders a client component on
 * the server too - verify it the only way that can tell the two apart,
 * `curl -s <url> | grep -i "<a course title>"`, never by looking at the page.
 *
 * The arrows render nothing at all until the effect below has measured the rail. That is the
 * degraded path: with JavaScript unavailable no arrows appear and the rail is still a plain
 * `overflow-x` scroller, so no card is unreachable. A "filter" section without JavaScript instead
 * shows every fetched talk with no way to narrow it - also not unreachable, just unfiltered. Do not
 * give the arrows a server-rendered fallback - they would be controls that cannot work.
 */

import Link from "next/link";
import type { RefObject } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { ContentCard } from "@/components/ui/ContentCard";
import { IconButton } from "@/components/ui/IconButton";
import { useScrollReveal } from "@/components/ui/ScrollReveal/useScrollReveal";
import { SectionMarker } from "@/components/ui/SectionMarker";
import { cn } from "@/components/utils";

import type { CourseRailCourse, CourseRailProps } from "./types";

/**
 * Card widths are `calc()` fractions of the rail, so `scrollLeft` rarely lands on a whole pixel and
 * an exact `=== 0` / `=== maxScrollLeft` comparison would leave an arrow enabled at either end.
 */
const SCROLL_EDGE_TOLERANCE_PX = 4;

/** No overflow until measured, which is what keeps the arrows out of the server-rendered HTML. */
const UNMEASURED_RAIL = { atEnd: true, atStart: true, hasOverflow: false };

interface RailState {
  atEnd: boolean;
  atStart: boolean;
  hasOverflow: boolean;
}

/**
 * 3.28 cards across the rail's own (edge-bled) width, which is what leaves a slice of the fourth
 * card visible as the signal that the row scrolls. It stays an inline style rather than an
 * arbitrary Tailwind value because a clamp nested inside a calc does not survive the class-name
 * escape: the spaces CSS requires around the minus sign collide with Tailwind's underscore escape
 * inside the inner clamp's own comma list. `ContentCard`'s own "course" width carries the identical
 * formula for the identical reason - this is deliberately the same string, not a shared import,
 * since a Payload-agnostic `ui/` cannot reach into another block's file either.
 */
const COURSE_CARD_WIDTH = "clamp(260px, calc((100% - 2 * clamp(16px, 1.6vw, 24px)) / 3.28), 460px)";

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** The concept's own numbers (07-footer.html:6-8): the heading and the chip cluster reveal after the eyebrow, at these extra delays on top of useScrollReveal's 50ms base - 120ms and 190ms total. */
const HEADING_REVEAL_DELAY_MS = 70;
const CHIP_CLUSTER_REVEAL_DELAY_MS = 140;
/** The rail's own `data-reveal-stagger="90"` (07-footer.html:31). */
const RAIL_CARD_STAGGER_STEP_MS = 90;

/** `measureChips()`'s own gap (07-footer.html:274), read live instead of hardcoded wherever the DOM will give it up - see `useChipOverflow` below. */
const CHIP_ROW_GAP_FALLBACK_PX = 10;

/**
 * Ported from the concept's `measureChips()` (07-footer.html:265-283). Two of its traps are kept on
 * purpose: a chip's width is cached the moment it first measures non-zero, so a chip already hidden
 * by a previous pass (`display:none` reports a 0-width rect) is never mistaken for having shrunk to
 * nothing; and measurement re-runs at +30/+120/+600ms, on `document.fonts.ready` and on resize/
 * `ResizeObserver`, because a web font swapping in after first paint is what made the original count
 * wrong on first render.
 *
 * `containerRef` sits on a plain wrapper OUTSIDE `ChipRow` rather than on `ChipRow` itself: `ChipRow`
 * is a plain function component with no forwarded ref, by its own design (client state belongs in
 * "the rail block that consumes this", per its file comment) - so this reads through the wrapper to
 * its one rendered child instead of asking the primitive to expose one.
 */
function useChipOverflow(chipCount: number): {
  containerRef: RefObject<HTMLDivElement | null>;
  visibleChipCount: number;
} {
  const containerRef = useRef<HTMLDivElement>(null);
  const chipWidthsRef = useRef<number[]>([]);
  const [visibleChipCount, setVisibleChipCount] = useState(chipCount);

  useEffect(() => {
    chipWidthsRef.current = [];
    setVisibleChipCount(chipCount);
  }, [chipCount]);

  useEffect(() => {
    const measure = () => {
      const row = containerRef.current?.firstElementChild;
      if (!(row instanceof HTMLElement)) return;
      const chipElements = Array.from(row.children);
      if (chipElements.length !== chipCount) return;

      const widths = chipWidthsRef.current;
      for (const [index, chip] of chipElements.entries()) {
        if (!(chip instanceof HTMLElement)) continue;
        const width = chip.getBoundingClientRect().width;
        if (width > 0) widths[index] = width;
      }
      if (widths.length < chipCount || widths.some((width) => !width)) return;

      const gapPx = Number.parseFloat(getComputedStyle(row).columnGap) || CHIP_ROW_GAP_FALLBACK_PX;
      let usedWidth = 0;
      let fittingCount = 0;
      for (const width of widths) {
        const nextWidth = usedWidth + (fittingCount ? gapPx : 0) + width;
        if (nextWidth > row.clientWidth + 0.5) break;
        usedWidth = nextWidth;
        fittingCount++;
      }
      setVisibleChipCount(Math.max(1, fittingCount));
    };

    measure();
    const retryTimeoutIds = [30, 120, 600].map((delayMs) => window.setTimeout(measure, delayMs));

    // A late-swapping web font is the concept's own reason for this retry (07-footer.html:240) -
    // `document.fonts.ready` has no synchronous form, so this is the one retry that has to be a
    // promise rather than a timeout. `isMounted` is what stops it from calling `measure` after the
    // cleanup below has already run, since the effect can be gone long before a font finishes.
    let isMounted = true;
    async function measureWhenFontsReady() {
      if (!document.fonts) return;
      await document.fonts.ready;
      if (isMounted) measure();
    }
    measureWhenFontsReady();

    window.addEventListener("resize", measure);
    const resizeObserver = new ResizeObserver(measure);
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    return () => {
      isMounted = false;
      for (const timeoutId of retryTimeoutIds) window.clearTimeout(timeoutId);
      window.removeEventListener("resize", measure);
      resizeObserver.disconnect();
    };
  }, [chipCount]);

  return { containerRef, visibleChipCount };
}

const RAIL_ARROW_PATHS = {
  next: "M1 5h13M10 1l4 4-4 4",
  prev: "M15 5H2M6 1L2 5l4 4",
};

interface RailArrowProps {
  direction: "next" | "prev";
  disabled: boolean;
  onClick: () => void;
  railElementId: string;
}

function RailArrow({ direction, disabled, onClick, railElementId }: RailArrowProps) {
  const isPrevious = direction === "prev";

  return (
    <IconButton
      aria-controls={railElementId}
      aria-label={isPrevious ? "Previous courses" : "Next courses"}
      disabled={disabled}
      onClick={onClick}
    >
      <svg aria-hidden fill="none" height="10" viewBox="0 0 16 10" width="17">
        <path
          d={RAIL_ARROW_PATHS[direction]}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </svg>
    </IconButton>
  );
}

interface CourseRailCardProps {
  course: CourseRailCourse;
  index: number;
}

/**
 * `ContentCard` is pure rendering - no `ref`, no `style` prop - so the entrance reveal (which needs
 * both, for its own IntersectionObserver and its opacity/transform) has to live on a wrapper. That
 * wrapper is deliberately also the box carrying `scroll-snap-align` and the width formula, so the
 * flex item the rail actually snaps against is the one box the reveal ref is attached to, rather
 * than two differently-sized ones - which is what a generic `<ScrollReveal stagger>` wrapper around
 * `ContentCard` would otherwise produce (see `useScrollReveal`'s own file comment on this exact
 * trade-off).
 */
function CourseRailCard({ course, index }: CourseRailCardProps) {
  const { ref, style } = useScrollReveal<HTMLDivElement>({
    staggerIndex: index,
    staggerStepMs: RAIL_CARD_STAGGER_STEP_MS,
  });

  return (
    <div
      className="flex-none snap-start"
      data-course-rail-card
      ref={ref}
      style={{ ...style, width: COURSE_CARD_WIDTH }}
    >
      <ContentCard
        className="h-full"
        cover={course.cover}
        dateLabel={course.dateLabel}
        description={course.description}
        eyebrow={course.eyebrow}
        href={course.href}
        price={course.price}
        priceBefore={course.priceBefore}
        rating={course.rating}
        title={course.title}
      />
    </div>
  );
}

/** `scrollRail()`'s own easing (07-footer.html:301), lifted unchanged. */
function easeInOutQuad(progress: number): number {
  return progress < 0.5 ? 2 * progress * progress : 1 - (-2 * progress + 2) ** 2 / 2;
}

/** `scrollRail()`'s own duration (07-footer.html:298). */
const RAIL_SCROLL_DURATION_MS = 380;

export function CourseRail({
  allTopicsHref,
  allTopicsLabel,
  courses,
  eyebrow,
  heading,
  topics: topicsConfig,
  viewAllHref,
  viewAllLabel,
}: CourseRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const railElementId = useId();
  const [railState, setRailState] = useState<RailState>(UNMEASURED_RAIL);
  const scrollAnimationFrameRef = useRef<number | null>(null);
  const [selectedTopicSlug, setSelectedTopicSlug] = useState<string | null>(null);

  const markerReveal = useScrollReveal<HTMLDivElement>();
  const headingReveal = useScrollReveal<HTMLHeadingElement>({ delay: HEADING_REVEAL_DELAY_MS });
  const chipClusterReveal = useScrollReveal<HTMLDivElement>({
    delay: CHIP_CLUSTER_REVEAL_DELAY_MS,
  });

  const topicList = topicsConfig.topics;
  const { containerRef: chipRowContainerRef, visibleChipCount } = useChipOverflow(topicList.length);

  // "filter" mode never navigates (07-footer.html's chips are all onClick, no href) - it narrows
  // `courses` in memory instead. "static" mode ignores `selectedTopicSlug` entirely: its chips are
  // editor-authored links or plain labels, exactly as before this pass.
  const displayedCourses =
    topicsConfig.mode === "filter" && selectedTopicSlug !== null
      ? courses.filter((course) => course.topicSlugs?.includes(selectedTopicSlug))
      : courses;

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const measure = () => {
      const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
      setRailState({
        atEnd: rail.scrollLeft >= maxScrollLeft - SCROLL_EDGE_TOLERANCE_PX,
        atStart: rail.scrollLeft <= SCROLL_EDGE_TOLERANCE_PX,
        hasOverflow: maxScrollLeft > SCROLL_EDGE_TOLERANCE_PX,
      });
    };

    measure();
    rail.addEventListener("scroll", measure, { passive: true });
    // A width change re-flows the cards, which changes how many fit and whether the rail overflows
    // at all - so a resize has to re-measure, not merely re-enable the arrows.
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(rail);

    return () => {
      rail.removeEventListener("scroll", measure);
      resizeObserver.disconnect();
    };
    // A topic switch changes how many cards are in the rail without changing the rail element's own
    // box, which is the only thing the ResizeObserver above watches - so the effect has to re-run
    // itself on that change rather than wait for a resize that never comes.
  }, [displayedCourses.length]);

  useEffect(
    () => () => {
      if (scrollAnimationFrameRef.current !== null) {
        cancelAnimationFrame(scrollAnimationFrameRef.current);
      }
    },
    []
  );

  const scrollRailByCard = useCallback((direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;

    const firstCard = rail.querySelector<HTMLElement>("[data-course-rail-card]");
    const gapPx = Number.parseFloat(getComputedStyle(rail).columnGap) || 0;
    const step = firstCard
      ? firstCard.getBoundingClientRect().width + gapPx
      : rail.clientWidth * 0.8;
    const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
    const from = rail.scrollLeft;
    const target = Math.max(0, Math.min(maxScrollLeft, from + direction * step));
    if (Math.abs(target - from) < 1) return;

    if (scrollAnimationFrameRef.current !== null) {
      cancelAnimationFrame(scrollAnimationFrameRef.current);
      scrollAnimationFrameRef.current = null;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      rail.scrollLeft = target;
      return;
    }

    // scroll-snap fights a manual scrollLeft tween - each written frame gets pulled back toward the
    // nearest snap point - so it is switched off for the tween's duration and restored after,
    // exactly as the concept's own scrollRail() does.
    const previousScrollSnapType = rail.style.scrollSnapType;
    rail.style.scrollSnapType = "none";
    const startTime = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / RAIL_SCROLL_DURATION_MS);
      rail.scrollLeft = from + (target - from) * easeInOutQuad(progress);
      if (progress < 1) {
        scrollAnimationFrameRef.current = requestAnimationFrame(tick);
      } else {
        scrollAnimationFrameRef.current = null;
        rail.style.scrollSnapType = previousScrollSnapType;
      }
    };
    scrollAnimationFrameRef.current = requestAnimationFrame(tick);
  }, []);

  if (courses.length === 0) return null;

  const showAllTopics = Boolean(allTopicsHref && allTopicsLabel);
  const showViewAll = Boolean(viewAllHref && viewAllLabel);
  const showLeftCluster = topicList.length > 0 || showAllTopics;
  const showRightCluster = showViewAll || railState.hasOverflow;

  return (
    <>
      {eyebrow && (
        <div
          className="mb-[clamp(10px,1.2vw,18px)]"
          ref={markerReveal.ref}
          style={markerReveal.style}
        >
          <SectionMarker>{eyebrow}</SectionMarker>
        </div>
      )}

      <h2
        className="text-display-1 m-0 mb-[clamp(28px,3.4vw,52px)] max-w-[22ch] text-balance text-foreground"
        ref={headingReveal.ref}
        style={headingReveal.style}
      >
        {heading}
      </h2>

      {(showLeftCluster || showRightCluster) && (
        <div
          className="mb-[clamp(24px,2.6vw,40px)] flex flex-col items-stretch gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-[clamp(12px,2vw,32px)]"
          ref={chipClusterReveal.ref}
          style={chipClusterReveal.style}
        >
          {showLeftCluster && (
            <div className="flex min-w-0 items-center gap-2.5 lg:flex-1">
              {topicList.length > 0 && (
                <div className="min-w-0 flex-1" ref={chipRowContainerRef}>
                  <ChipRow>
                    {topicsConfig.mode === "static"
                      ? topicsConfig.topics.map((topic, topicIndex) => (
                          <Chip
                            className={topicIndex < visibleChipCount ? undefined : "hidden"}
                            href={topic.href}
                            isActive={topic.isSelected}
                            key={topicIndex}
                          >
                            {topic.label}
                          </Chip>
                        ))
                      : topicsConfig.topics.map((topic, topicIndex) => (
                          <Chip
                            className={topicIndex < visibleChipCount ? undefined : "hidden"}
                            isActive={selectedTopicSlug === topic.topicSlug}
                            key={topicIndex}
                            onClick={() => setSelectedTopicSlug(topic.topicSlug)}
                          >
                            {topic.label}
                          </Chip>
                        ))}
                  </ChipRow>
                </div>
              )}

              {showAllTopics && allTopicsHref && (
                <Button asChild caps tone="surface">
                  <Link href={allTopicsHref}>
                    {allTopicsLabel}
                    <svg aria-hidden fill="none" height="6" viewBox="0 0 10 6" width="10">
                      <path
                        d="M1 1l4 4 4-4"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.4"
                      />
                    </svg>
                  </Link>
                </Button>
              )}
            </div>
          )}

          {showRightCluster && (
            <div className="flex flex-none items-center gap-[clamp(8px,1vw,12px)]">
              {showViewAll && viewAllHref && (
                <Button asChild tone="primary">
                  <Link href={viewAllHref}>{viewAllLabel}</Link>
                </Button>
              )}

              {railState.hasOverflow && (
                <>
                  <RailArrow
                    direction="prev"
                    disabled={railState.atStart}
                    onClick={() => scrollRailByCard(-1)}
                    railElementId={railElementId}
                  />
                  <RailArrow
                    direction="next"
                    disabled={railState.atEnd}
                    onClick={() => scrollRailByCard(1)}
                    railElementId={railElementId}
                  />
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/*
        The 4px/-4px and 24px/-24px padding-and-margin pairs give the card's hover lift and its
        focus ring room inside a clipping scroll container without adding visible space. The
        negative right margin bleeds the rail to the viewport edge; SectionContainer's own
        `overflow-clip` and `overflow-hidden` clip it there, so the page never scrolls sideways.

        tabIndex is deliberate: Firefox and Safari do not make a scroll container focusable on their
        own, so without it a keyboard user cannot arrow the rail - and the arrow buttons do not
        exist until this component has hydrated and measured.
      */}
      <div
        aria-label={heading}
        className={cn(
          "scrollbar-none flex items-stretch gap-[clamp(16px,1.6vw,24px)]",
          "overflow-x-auto overflow-y-hidden overscroll-x-contain snap-x snap-proximity",
          "-mt-1 -mb-6 mr-[calc(50%_-_50vw)] pt-1 pr-[clamp(16px,2.5vw,40px)] pb-6",
          "motion-safe:scroll-smooth",
          FOCUS_RING
        )}
        id={railElementId}
        ref={railRef}
        role="group"
        tabIndex={0}
      >
        {displayedCourses.map((course, courseIndex) => (
          <CourseRailCard course={course} index={courseIndex} key={courseIndex} />
        ))}
      </div>
    </>
  );
}

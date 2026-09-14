"use client";

/**
 * The course rail: a header, a row of topic chips and controls, and a horizontally scrolling row of
 * course cards.
 *
 * Why the whole section is a client module rather than only the arrows: the two arrows move the
 * rail with `scrollBy`, which nothing in HTML can do. The cards are still in the server-rendered
 * HTML, because Next renders a client component on the server too - verify it the only way that can
 * tell the two apart, `curl -s <url> | grep -i "<a course title>"`, never by looking at the page.
 *
 * The arrows render nothing at all until the effect below has measured the rail. That is the
 * degraded path: with JavaScript unavailable no arrows appear and the rail is still a plain
 * `overflow-x` scroller, so no card is unreachable. Do not give them a server-rendered fallback -
 * they would be controls that cannot work.
 */

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Media } from "@/components/media";
import { cn } from "@/components/utils";

import type { CourseRailCourse, CourseRailProps, CourseRailTopic } from "./types";

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

const RATING_STAR_COUNT = 5;

/**
 * 3.28 cards across the rail's own (edge-bled) width, which is what leaves a slice of the fourth
 * card visible as the signal that the row scrolls. It stays an inline style rather than an
 * arbitrary Tailwind value because a clamp nested inside a calc does not survive the class-name
 * escape: the spaces CSS requires around the minus sign collide with Tailwind's underscore escape
 * inside the inner clamp's own comma list.
 */
const COURSE_CARD_WIDTH = "clamp(260px, calc((100% - 2 * clamp(16px, 1.6vw, 24px)) / 3.28), 460px)";

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

const CONTROL_BOX =
  "inline-flex flex-none items-center h-[clamp(40px,3.4vw,46px)] rounded-lg whitespace-nowrap";

const CHIP_BOX = cn(
  CONTROL_BOX,
  "border px-[clamp(12px,1.3vw,20px)]",
  "transition-colors duration-200 ease-out motion-reduce:transition-none"
);

/**
 * tailwind-merge reads this design system's type utilities - `text-eyebrow`, `text-small`,
 * `text-h-card` - as colour utilities, because their value is a bare word rather than a size on
 * its scale. So inside a single `cn()` call a later `text-<colour>` silently deletes the one that
 * sets the size, weight and tracking, and the control renders at body size with no warning. Keeping
 * the type utility outside `cn()` is what stops that, and is why every className below that mixes
 * the two goes through here.
 */
function withTypeUtility(typeUtility: string, ...classNames: Parameters<typeof cn>) {
  return `${typeUtility} ${cn(...classNames)}`;
}

function SparkleGlyph() {
  return (
    <svg
      aria-hidden
      className="shrink-0 text-primary"
      fill="currentColor"
      height="14"
      viewBox="0 0 14 14"
      width="14"
    >
      <path d="M7 0l1.3 4.4L13 5.7 8.4 7 7 14 5.6 7 1 5.7 5.7 4.4z" />
    </svg>
  );
}

function TopicChip({ topic }: { topic: CourseRailTopic }) {
  const toneClassName = topic.isSelected
    ? "bg-primary text-primary-foreground border-primary"
    : "bg-background text-foreground border-border";

  // A chip with no destination is a label, not a control: an `<a href="#">` would be a link to
  // nowhere and a `<button>` would be a click that does nothing.
  if (!topic.href) {
    return (
      <span className={withTypeUtility("text-eyebrow", CHIP_BOX, toneClassName)}>
        {topic.label}
      </span>
    );
  }

  return (
    <Link
      aria-current={topic.isSelected ? "true" : undefined}
      className={withTypeUtility(
        "text-eyebrow",
        CHIP_BOX,
        toneClassName,
        topic.isSelected ? "hover:bg-primary-hover" : "hover:bg-primary-soft",
        FOCUS_RING
      )}
      href={topic.href}
    >
      {topic.label}
    </Link>
  );
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
    <button
      aria-controls={railElementId}
      aria-label={isPrevious ? "Previous courses" : "Next courses"}
      className={cn(
        "hidden size-[clamp(40px,3.4vw,46px)] flex-none items-center justify-center p-0 md:inline-flex",
        "rounded-lg border border-border bg-background",
        "transition-colors duration-200 ease-out hover:border-primary hover:bg-primary-soft",
        "disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none",
        FOCUS_RING
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
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
    </button>
  );
}

const RATING_STAR_PATH = "M6 .8l1.6 3.3 3.6.5-2.6 2.5.6 3.6L6 9l-3.2 1.7.6-3.6L.8 4.6l3.6-.5z";

/**
 * Five identical unlabelled glyphs read as nothing, and the printed figure alone reads as a bare
 * number, so the sentence in between carries the whole meaning and both visible parts are hidden
 * from a screen reader.
 */
function RatingCluster({ rating }: { rating: number }) {
  const filledCount = Math.round(rating);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span aria-hidden className="flex items-center gap-0.5">
        {Array.from({ length: RATING_STAR_COUNT }, (_, starIndex) => (
          <svg
            className={starIndex < filledCount ? "text-primary" : "text-ink-12"}
            fill="currentColor"
            height="13"
            key={starIndex}
            viewBox="0 0 12 12"
            width="13"
          >
            <path d={RATING_STAR_PATH} />
          </svg>
        ))}
      </span>
      <span className="sr-only">{`Rated ${rating.toFixed(1)} out of 5`}</span>
      <span aria-hidden className="text-small font-medium tabular-nums text-foreground">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

function CourseCardBody({ course }: { course: CourseRailCourse }) {
  return (
    <>
      <div className="relative aspect-[485/300] w-full flex-none overflow-hidden rounded-lg bg-primary-soft">
        <Media
          {...course.cover.data}
          imageProps={{
            ...course.cover.imageProps,
            className: "size-full object-cover",
            fill: true,
            fit: "cover",
            sizes: "(max-width: 640px) 80vw, (max-width: 1024px) 45vw, 380px",
          }}
          visualEditing={course.cover.visualEditing}
        />
      </div>

      {(course.rating != null || course.dateLabel) && (
        <div
          className={cn(
            "flex items-center gap-3 px-1 pt-[clamp(12px,1.2vw,18px)] pb-[clamp(8px,0.9vw,12px)]",
            // With no rating there is nothing on the left, so the date keeps its own corner
            // instead of sliding across to where the stars would have been.
            course.rating == null ? "justify-end" : "justify-between"
          )}
        >
          {course.rating != null && <RatingCluster rating={course.rating} />}
          {course.dateLabel && (
            <span className="text-eyebrow whitespace-nowrap text-ink-42">{course.dateLabel}</span>
          )}
        </div>
      )}

      <h3 className="text-h-card m-0 mb-[clamp(8px,0.9vw,12px)] px-1 text-pretty text-foreground">
        {course.title}
      </h3>

      {course.description && (
        <p className="text-small m-0 mb-[clamp(14px,1.6vw,22px)] px-1 text-pretty text-muted-foreground">
          {course.description}
        </p>
      )}

      {course.price && (
        <div className="mt-auto flex flex-wrap items-baseline gap-2.5 px-1 pb-1">
          <span className="text-lead font-medium text-primary">{course.price}</span>
          {course.priceBefore && (
            <span className="text-small text-ink-42 line-through">{course.priceBefore}</span>
          )}
        </div>
      )}
    </>
  );
}

function CourseCard({ course }: { course: CourseRailCourse }) {
  const cardClassName = cn(
    "group box-border flex flex-none snap-start flex-col rounded-xl border border-ink-08 bg-card",
    "p-[clamp(10px,1vw,14px)] text-foreground",
    "transition-[transform,border-color] duration-300 ease-out",
    "hover:-translate-y-0.5 hover:border-ink-16",
    "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
    FOCUS_RING
  );

  if (!course.href) {
    return (
      <article className={cardClassName} style={{ width: COURSE_CARD_WIDTH }}>
        <CourseCardBody course={course} />
      </article>
    );
  }

  return (
    <Link className={cardClassName} href={course.href} style={{ width: COURSE_CARD_WIDTH }}>
      <CourseCardBody course={course} />
    </Link>
  );
}

export function CourseRail({
  allTopicsHref,
  allTopicsLabel,
  courses,
  eyebrow,
  heading,
  topics,
  viewAllHref,
  viewAllLabel,
}: CourseRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const railElementId = useId();
  const [railState, setRailState] = useState<RailState>(UNMEASURED_RAIL);

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
  }, []);

  const scrollByPage = useCallback((direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    // One visible width of cards. Passing no `behavior` leaves the choice to the element's CSS
    // `scroll-behavior`, which is smooth only under `motion-safe`.
    rail.scrollBy({ left: direction * rail.clientWidth });
  }, []);

  if (courses.length === 0) return null;

  const showAllTopics = Boolean(allTopicsHref && allTopicsLabel);
  const showViewAll = Boolean(viewAllHref && viewAllLabel);
  const showLeftCluster = topics.length > 0 || showAllTopics;
  const showRightCluster = showViewAll || railState.hasOverflow;

  return (
    <>
      {eyebrow && (
        <div className="mb-[clamp(10px,1.2vw,18px)] flex items-center gap-2.5">
          <SparkleGlyph />
          <span className="text-small text-foreground">{eyebrow}</span>
        </div>
      )}

      <h2 className="text-display-1 m-0 mb-[clamp(28px,3.4vw,52px)] max-w-[22ch] text-balance text-foreground">
        {heading}
      </h2>

      {(showLeftCluster || showRightCluster) && (
        <div className="mb-[clamp(24px,2.6vw,40px)] flex flex-col items-stretch gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-[clamp(12px,2vw,32px)]">
          {showLeftCluster && (
            <div className="flex min-w-0 items-center gap-2.5 lg:flex-1">
              {topics.length > 0 && (
                // The design hid the chips that did not fit by measuring them in JavaScript. A
                // scroller reaches the same chips without needing JavaScript to decide which ones a
                // crawler is allowed to see, and the fade replaces the hard cut that measurement
                // was there to avoid.
                <div className="scrollbar-none mask-fade-right flex min-w-0 flex-1 flex-nowrap items-center gap-2.5 overflow-x-auto">
                  {topics.map((topic, topicIndex) => (
                    <TopicChip key={topicIndex} topic={topic} />
                  ))}
                </div>
              )}

              {showAllTopics && allTopicsHref && (
                <Link
                  className={withTypeUtility(
                    "text-eyebrow",
                    CHIP_BOX,
                    "gap-2 border-border bg-background text-foreground",
                    "hover:border-primary hover:bg-primary-soft",
                    FOCUS_RING
                  )}
                  href={allTopicsHref}
                >
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
              )}
            </div>
          )}

          {showRightCluster && (
            <div className="flex flex-none items-center gap-[clamp(8px,1vw,12px)]">
              {showViewAll && viewAllHref && (
                <Link
                  className={withTypeUtility(
                    "text-small",
                    CONTROL_BOX,
                    "px-[clamp(14px,1.7vw,24px)] font-medium",
                    "bg-primary text-primary-foreground",
                    "transition-colors duration-200 ease-out hover:bg-primary-hover",
                    "motion-reduce:transition-none",
                    FOCUS_RING
                  )}
                  href={viewAllHref}
                >
                  {viewAllLabel}
                </Link>
              )}

              {railState.hasOverflow && (
                <>
                  <RailArrow
                    direction="prev"
                    disabled={railState.atStart}
                    onClick={() => scrollByPage(-1)}
                    railElementId={railElementId}
                  />
                  <RailArrow
                    direction="next"
                    disabled={railState.atEnd}
                    onClick={() => scrollByPage(1)}
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
        {courses.map((course, courseIndex) => (
          <CourseCard course={course} key={courseIndex} />
        ))}
      </div>
    </>
  );
}

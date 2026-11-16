"use client";

import React, { useEffect, useRef, useState } from "react";

const SCROLL_SETTLE_MS = 200;
const START_THRESHOLD = 100;
const END_THRESHOLD = 30;

/**
 * The scrolling row of conditions in the condition hero. The stylesheet shows the `prev` and `next`
 * arrows on wide screens once the container has `left-arrow` or `right-arrow`.
 */
export function SymptomHeroNav({ children }: { children: React.ReactNode }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);

  useEffect(() => {
    const list = listRef.current;

    if (!list) {
      return;
    }

    let settleTimer: number | undefined;
    const update = () => {
      setCanScrollBack(list.scrollLeft > START_THRESHOLD);
      setCanScrollForward(list.scrollLeft < list.scrollWidth - list.offsetWidth - END_THRESHOLD);
    };
    const onScroll = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(update, SCROLL_SETTLE_MS);
    };

    update();
    list.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.clearTimeout(settleTimer);
      list.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
    };
  }, []);

  const scrollByOneItem = (direction: 1 | -1) => {
    const list = listRef.current;
    const itemWidth = list?.querySelector("li")?.offsetWidth ?? 0;

    list?.scrollBy({ behavior: "smooth", left: direction * itemWidth, top: 0 });
  };

  const containerClass = [
    "symptom-nav_hero_container",
    canScrollBack ? "left-arrow" : "",
    canScrollForward ? "right-arrow" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClass}>
      <div aria-hidden="true" className="prev" onClick={() => scrollByOneItem(-1)} />
      <ul className="symptom-nav_hero" ref={listRef}>
        {children}
      </ul>
      <div aria-hidden="true" className="next" onClick={() => scrollByOneItem(1)} />
    </div>
  );
}

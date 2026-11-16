"use client";

import React, { useEffect, useRef, useState } from "react";

// The original script shows a chapter's picture once the chapter's top passes this line.
const REVEAL_OFFSET = 320;

interface Props {
  pictures: { id: string; picture: React.ReactNode }[];
}

/** The sticky picture column: the first picture shows at once, each later one as its chapter arrives. */
export function StickyMediaAside({ pictures }: Props) {
  const asideRef = useRef<HTMLElement>(null);
  const [lastVisible, setLastVisible] = useState(0);

  useEffect(() => {
    const chapters =
      asideRef.current?.parentElement?.querySelectorAll<HTMLElement>(".sticky_section_copy");

    if (!chapters?.length) {
      return;
    }

    let frame = 0;

    const update = () => {
      frame = 0;
      let reached = 0;

      for (const [index, chapter] of [...chapters].entries()) {
        if (chapter.getBoundingClientRect().top <= REVEAL_OFFSET) {
          reached = index;
        }
      }
      setLastVisible(reached);
    };

    const schedule = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <aside className="sticky_section_right" ref={asideRef}>
      {pictures.map(({ id, picture }, index) => (
        <figure
          className={index <= lastVisible ? "sticky_section_image visible" : "sticky_section_image"}
          data-position={index}
          key={id}
        >
          {picture}
        </figure>
      ))}
    </aside>
  );
}

"use client";

import React, { useEffect, useRef, useState } from "react";

import type { ArticleHeading } from "./ArticleRichText";

interface Props {
  title: string;
  headings: ArticleHeading[];
}

const DESKTOP_MIN_WIDTH = 1200;

// The header is fixed and, below desktop width, the open contents list sits under it as well.
function scrollToHeading(id: string, mobileList: HTMLElement | null): void {
  const target = document.querySelector(`#${id}`);

  if (!target) {
    return;
  }

  const headerHeight = document.querySelector<HTMLElement>("#header")?.offsetHeight ?? 0;
  const listHeight = window.innerWidth < DESKTOP_MIN_WIDTH ? (mobileList?.offsetHeight ?? 0) : 0;
  const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - listHeight;

  window.scrollTo({ behavior: "smooth", top });
}

/** "In this article": the desktop list and the phone dropdown, both linking to the h2 anchors. */
export function ArticleContents({ title, headings }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const mobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mobileRef.current;
    const toggle = () => setIsOpen((open) => !open);

    container?.addEventListener("click", toggle);

    return () => container?.removeEventListener("click", toggle);
  }, []);

  const links = headings.map((heading) => (
    <li key={heading.id}>
      <a
        className="scroll-link-tc"
        href={`#${heading.id}`}
        onClick={(event) => {
          event.preventDefault();
          scrollToHeading(heading.id, mobileRef.current);
        }}
      >
        {heading.text}
      </a>
    </li>
  ));

  return (
    <>
      <div className="tc-container" id="tc-button">
        <div className="tc-header">{title}</div>
        <ol id="tc-dropdown">{links}</ol>
      </div>
      <div
        className={isOpen ? "tc-container-mobile open" : "tc-container-mobile"}
        id="tc-button-mobile"
        ref={mobileRef}
      >
        <div className="tc-header-mobile">{title}</div>
        <ol id="tc-dropdown-mobile" style={isOpen ? { display: "block" } : undefined}>
          {links}
        </ol>
      </div>
    </>
  );
}

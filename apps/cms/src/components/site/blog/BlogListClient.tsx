"use client";

import React, { useEffect, useRef, useState } from "react";

interface ListedCard {
  id: string;
  /** Slugs of the article's tags. */
  tags: string[];
  card: React.ReactNode;
}

interface ListedTag {
  slug: string;
  title: string;
  href: string;
}

interface Props {
  tagsTitle?: string | null;
  allText?: string | null;
  allHref: string;
  tags: ListedTag[];
  heading?: string | null;
  moreText?: string | null;
  pageSize: number;
  cards: ListedCard[];
  blurb: React.ReactNode;
}

const tagClass = (isCurrent: boolean): string =>
  isCurrent ? "button small-pink current" : "button small-pink";

/**
 * The site filters its list by tag and loads more articles without leaving the page. Every
 * article is rendered on the server, so both happen here by showing and hiding cards.
 */
export function BlogListClient({
  tagsTitle,
  allText,
  allHref,
  tags,
  heading,
  moreText,
  pageSize,
  cards,
  blurb,
}: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const scrollToList = () => sectionRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tag");

    if (requested) {
      setActiveTag(requested);
      sectionRef.current?.scrollIntoView();
    }
  }, []);

  const selectTag = (event: React.MouseEvent<HTMLAnchorElement>, slug: string | null) => {
    event.preventDefault();

    if (slug === activeTag) {
      return;
    }

    setActiveTag(slug);
    setVisibleCount(pageSize);
    scrollToList();
  };

  const matching = activeTag ? cards.filter((card) => card.tags.includes(activeTag)) : cards;
  const shown = matching.slice(0, visibleCount);

  return (
    <section id="blog-sidebar" ref={sectionRef}>
      <div className="container">
        <div id="sidebar">
          <div className="tags-container">
            {tagsTitle && <div className="title">{tagsTitle}</div>}
            <ul className="tags">
              {allText && (
                <li>
                  <a
                    className={tagClass(activeTag === null)}
                    href={allHref}
                    onClick={(event) => selectTag(event, null)}
                  >
                    {allText}
                  </a>
                </li>
              )}
              {tags.map((tag) => (
                <li key={tag.slug}>
                  <a
                    className={tagClass(activeTag === tag.slug)}
                    href={tag.href}
                    onClick={(event) => selectTag(event, tag.slug)}
                  >
                    {tag.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div id="content">
          {heading && <h2 className="latest-articles-header">{heading}</h2>}
          <ul id="posts-list">
            {shown.map((card) => (
              <li className="blog-post-card" key={card.id}>
                {card.card}
              </li>
            ))}
          </ul>
          <div className={shown.length < matching.length ? undefined : "hidden"} id="pagination">
            <button
              className="button border"
              onClick={() => setVisibleCount((count) => count + pageSize)}
              type="button"
            >
              {moreText}
            </button>
          </div>
          {blurb}
        </div>
      </div>
    </section>
  );
}

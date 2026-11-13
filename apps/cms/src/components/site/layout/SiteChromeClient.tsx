"use client";

import React, { useEffect, useState } from "react";

interface BodyAttributesProps {
  id: string;
  className: string;
}

/**
 * The site's stylesheet keys page-specific rules on the id and classes of `body`, which the root
 * layout owns. The inline script sets them before first paint; the effect keeps them right when
 * the live preview re-renders the page without a document load.
 */
export function BodyAttributes({ id, className }: BodyAttributesProps) {
  useEffect(() => {
    document.body.id = id;
    document.body.className = className;
  }, [id, className]);

  const script = `document.body.id=${JSON.stringify(id)};document.body.className=${JSON.stringify(className)};`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

const STICKY_SCROLL_OFFSET = 10;

/** Adds the `sticky` body class once the page is scrolled, which collapses the announcement bar. */
export function StickyHeaderEffect() {
  useEffect(() => {
    const update = () => {
      document.body.classList.toggle("sticky", window.scrollY > STICKY_SCROLL_OFFSET);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });

    return () => window.removeEventListener("scroll", update);
  }, []);

  return null;
}

export function MenuButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("menu-open", open);

    return () => document.body.classList.remove("menu-open");
  }, [open]);

  return (
    <button
      aria-expanded={open}
      aria-haspopup="true"
      aria-label="Menu Button"
      id="menu-button"
      onClick={() => setOpen((current) => !current)}
      type="button"
    >
      <span />
    </button>
  );
}

interface AccordionItemProps {
  title: React.ReactNode;
  children: React.ReactNode;
}

/** One `li.accordion` of the site: a button that shows and hides the `div.answer` after it. */
export function SiteAccordionItem({ title, children }: AccordionItemProps) {
  const [open, setOpen] = useState(false);

  return (
    <li className={open ? "accordion open" : "accordion"}>
      <button
        aria-expanded={open}
        className="accordion-button"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {title}
      </button>
      <div className="answer" style={{ display: open ? "block" : "none" }}>
        {children}
      </div>
    </li>
  );
}

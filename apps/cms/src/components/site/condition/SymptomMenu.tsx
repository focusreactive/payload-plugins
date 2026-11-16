"use client";

import React, { useEffect, useRef, useState } from "react";

const SHOW_AFTER_MAIN_TOP = 150;
const LOCKED_BODY_CLASS = "unscrollable";

interface SymptomMenuProps {
  heading?: string | null;
  children: React.ReactNode;
}

/**
 * `nav.symptom-nav`: the conditions menu that slides in once the page's content reaches the top,
 * and opens on hover or, on touch screens, on a tap of its heading.
 */
export function SymptomMenu({ heading, children }: SymptomMenuProps) {
  const navRef = useRef<HTMLElement>(null);
  const [pastHero, setPastHero] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const main = document.querySelector("#main");
    const update = () => {
      setPastHero(Boolean(main && main.getBoundingClientRect().top <= SHOW_AFTER_MAIN_TOP));
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle(LOCKED_BODY_CLASS, open);

    if (!open) {
      return;
    }

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("click", closeOnOutsideClick);

    return () => {
      window.removeEventListener("click", closeOnOutsideClick);
      document.body.classList.remove(LOCKED_BODY_CLASS);
    };
  }, [open]);

  const className = ["symptom-nav", pastHero || open ? "show" : "", open ? "open" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <nav
      className={className}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
      onFocus={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onMouseOver={() => setOpen(true)}
      ref={navRef}
    >
      <div className="symptom-nav_heading" onTouchEnd={() => setOpen((current) => !current)}>
        <h2>{heading}</h2>
      </div>
      <ul className="symptom-nav_dropdown">{children}</ul>
    </nav>
  );
}

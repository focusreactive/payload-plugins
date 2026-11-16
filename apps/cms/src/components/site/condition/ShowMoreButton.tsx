"use client";

import React, { useState } from "react";

interface ShowMoreButtonProps {
  showMoreText: string;
  showLessText: string;
}

// The stylesheet hides the list's sixth item onwards on phones; the original script shows them inline.
const HIDDEN_ITEMS_SELECTOR = ":scope > li:nth-child(n+6)";

/** The conditions grid's `button.show-more`, which opens and closes the rest of the list before it. */
export function ShowMoreButton({ showMoreText, showLessText }: ShowMoreButtonProps) {
  const [expanded, setExpanded] = useState(false);

  const toggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    const list = event.currentTarget.previousElementSibling;
    const nextExpanded = !expanded;

    if (list) {
      for (const item of list.querySelectorAll<HTMLElement>(HIDDEN_ITEMS_SELECTOR)) {
        item.style.display = nextExpanded ? "flex" : "none";
      }
    }

    setExpanded(nextExpanded);
  };

  return (
    <button
      className={expanded ? "show-more expanded" : "show-more"}
      onClick={toggle}
      type="button"
    >
      {expanded ? showLessText || showMoreText : showMoreText}
    </button>
  );
}

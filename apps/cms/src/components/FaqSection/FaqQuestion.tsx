"use client";

import { useId, useState } from "react";

import { cx } from "@/shared/lib/utils/cx";

/**
 * One row of Untitled UI's faq-accordion-03. Their source animates the panel with motion, which
 * this app does not ship; a grid-rows transition gives the same open and close without adding a
 * dependency for one section.
 */
export function FaqQuestion({
  question,
  defaultOpen,
  children,
}: {
  question: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div>
      <h3>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setIsOpen((open) => !open)}
          className="flex w-full cursor-pointer items-start justify-between gap-6 rounded-md text-left outline-focus-ring select-none focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <span className="text-md font-semibold text-primary">{question}</span>
          <span aria-hidden="true" className="flex size-6 shrink-0 items-center text-fg-quaternary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line
                className={cx(
                  "origin-center rotate-0 transition duration-150 ease-out",
                  isOpen && "-rotate-90"
                )}
                x1="12"
                y1="8"
                x2="12"
                y2="16"
              />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </span>
        </button>
      </h3>
      <div
        id={panelId}
        className={cx(
          "grid transition-all duration-200 ease-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="pt-1 pr-12 text-md text-tertiary">{children}</div>
        </div>
      </div>
    </div>
  );
}

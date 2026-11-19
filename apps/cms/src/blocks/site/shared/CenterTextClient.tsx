"use client";

import React, { useState } from "react";

const QUESTION_TYPE = "https://schema.org/Question";
const ANSWER_TYPE = "https://schema.org/Answer";

export interface FaqEntry {
  key: string;
  question: React.ReactNode;
  answer: React.ReactNode;
}

interface FaqAccordionProps {
  entries: FaqEntry[];
  firstOpen: boolean;
  schema: boolean;
}

/** The site's `ul.accordion`: one answer open at a time, shown by the `open` class on its button. */
export function FaqAccordion({ entries, firstOpen, schema }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(firstOpen ? 0 : null);

  return (
    <ul className="accordion">
      {entries.map((entry, index) => {
        const open = index === openIndex;
        const answerSchema = schema
          ? { itemProp: "acceptedAnswer", itemScope: true, itemType: ANSWER_TYPE }
          : {};

        return (
          <li
            key={entry.key}
            {...(schema
              ? { itemProp: "mainEntity", itemScope: true, itemType: QUESTION_TYPE }
              : {})}
          >
            <button
              aria-expanded={open}
              className={open ? "accordion-button open" : "accordion-button"}
              itemProp={schema ? "name" : undefined}
              onClick={() => setOpenIndex(open ? null : index)}
              type="button"
            >
              <h3>{entry.question}</h3>
              <span className="plus" />
            </button>
            <div className="answer" {...answerSchema}>
              {schema ? <div itemProp="text">{entry.answer}</div> : entry.answer}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

interface LinkCardProps {
  href?: string;
  children: React.ReactNode;
}

/** The site's `div.image-card.link`: the whole card opens its page, links inside it keep their own. */
export function LinkCard({ href, children }: LinkCardProps) {
  const open = (target: EventTarget) => {
    if (href && !(target instanceof Element && target.closest("a"))) {
      window.location.assign(href);
    }
  };

  return (
    <div
      className="image-card link"
      data-href={href}
      onClick={(event) => open(event.target)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          open(event.target);
        }
      }}
      role="link"
      tabIndex={0}
    >
      {children}
    </div>
  );
}

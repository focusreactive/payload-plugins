"use client";

import React, { useState } from "react";

interface FaqItem {
  id: string;
  question: string;
  answer: React.ReactNode;
}

interface Props {
  heading?: string | null;
  headingId: string;
  items: FaqItem[];
}

/** The questions at the end of an article: the site's accordion, one answer open at a time. */
export function ArticleFaq({ heading, headingId, items }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="center_text bg">
      <div className="container">
        {heading && (
          <h2 className="tc-header-landing" id={headingId}>
            {heading}
          </h2>
        )}
        <ul className="accordion">
          {items.map((item) => {
            const isOpen = openId === item.id;

            return (
              <li
                itemProp="mainEntity"
                itemScope
                itemType="https://schema.org/Question"
                key={item.id}
              >
                <button
                  aria-expanded={isOpen}
                  className={isOpen ? "accordion-button open" : "accordion-button"}
                  itemProp="name"
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  type="button"
                >
                  <h3>{item.question}</h3>
                  <span className="plus" />
                </button>
                <div
                  className="answer"
                  itemProp="acceptedAnswer"
                  itemScope
                  itemType="https://schema.org/Answer"
                >
                  <div itemProp="text">{item.answer}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

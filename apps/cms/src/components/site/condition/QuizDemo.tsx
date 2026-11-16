import React from "react";

import type { SiteBlockProps } from "@/blocks/site/types";
import { SiteButton } from "@/components/site/SiteButton";
import { InlineRichText, hasRichText } from "@/components/site/SiteRichText";
import type { QuizDemoBlock } from "@/payload-types";

// The original names the answer inputs this way; the quiz page itself is a separate form.
const ANSWER_GROUP = "severity";

/** `section.quiz_demo`: a teaser of the vein health quiz, a row of answers and the button to it. */
export function QuizDemo({
  eyebrow,
  heading,
  text,
  answers,
  button,
  locale,
}: SiteBlockProps<QuizDemoBlock>) {
  const answerLabels = (answers ?? []).filter(Boolean);

  return (
    <section className="quiz_demo">
      <div className="container">
        <div className="quiz-demo-container">
          {eyebrow && <h2 className="small">{eyebrow}</h2>}
          {hasRichText(heading) && (
            <h2>
              <InlineRichText data={heading} />
            </h2>
          )}
          {text && <p>{text}</p>}
          {answerLabels.length > 0 && (
            <div className="input-group">
              {answerLabels.map((answer, index) => {
                const inputId = `${index}-${ANSWER_GROUP}`;

                return (
                  <div className="radio-group" key={inputId}>
                    <input id={inputId} name={ANSWER_GROUP} type="radio" value={index} />
                    <label htmlFor={inputId}>
                      <span>{answer}</span>
                    </label>
                  </div>
                );
              })}
            </div>
          )}
          <SiteButton button={button} locale={locale} />
        </div>
      </div>
    </section>
  );
}

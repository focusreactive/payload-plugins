import React from "react";

import type { Locale } from "@/lib/types";

import { BodyText, HeadingText } from "./content";
import type { TextOrRichText } from "./content";

/** The `simple` hero: a centred heading and text on a plain band, from a block or a record. */
export interface SimpleHeroProps {
  locale: Locale;
  heading?: TextOrRichText;
  text?: TextOrRichText;
}

export function SimpleHero({ locale, heading, text }: SimpleHeroProps) {
  return (
    <section className="simple" id="hero">
      <div className="container">
        <h1>
          <HeadingText value={heading} />
        </h1>
        <BodyText locale={locale} value={text} />
      </div>
    </section>
  );
}

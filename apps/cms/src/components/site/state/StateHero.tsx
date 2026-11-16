import React from "react";

import { HeadingText, hasText } from "@/blocks/site/shared/content";
import { SiteButton } from "@/components/site/SiteButton";
import { SiteBackground, SiteImage, mediaOf } from "@/components/site/SiteImage";
import { SiteRichText } from "@/components/site/SiteRichText";
import { siteLinkHref } from "@/lib/site/links";
import type { Locale } from "@/lib/types";
import type { State } from "@/payload-types";

/** The state page's top section, built from the state record. */
export function StateHero({ doc, locale }: { doc: State; locale: Locale }) {
  const mobileImage = mediaOf(doc.heroMobileImage) ? doc.heroMobileImage : doc.heroImage;

  return (
    <section id="hero">
      {mediaOf(doc.heroImage) && (
        <SiteBackground className="bg-container first desktop" media={doc.heroImage} />
      )}
      {mediaOf(mobileImage) && (
        <SiteBackground className="bg-container first mobile" media={mobileImage} />
      )}
      <div className="container">
        {hasText(doc.heroTagline) && (
          <p>
            <HeadingText value={doc.heroTagline} />
          </p>
        )}
        {doc.heroButton?.text && siteLinkHref(doc.heroButton.link, locale) && (
          <p>
            <SiteButton button={doc.heroButton} locale={locale} />
          </p>
        )}
        {mediaOf(doc.heroBadge) && (
          <figure className="badge">
            <SiteImage className="not-lazy" eager media={doc.heroBadge} />
          </figure>
        )}
        <h1>{doc.heroTitle || doc.name}</h1>
        <SiteRichText data={doc.heroIntro} locale={locale} />
      </div>
    </section>
  );
}

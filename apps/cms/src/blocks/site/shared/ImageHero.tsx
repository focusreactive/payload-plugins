import React from "react";

import { SiteButton } from "@/components/site/SiteButton";
import { SiteImage, mediaOf } from "@/components/site/SiteImage";
import { SiteRichText, hasRichText } from "@/components/site/SiteRichText";
import { siteLinkHref, siteLinkTarget, telHref } from "@/lib/site/links";
import type { SiteLinkValue } from "@/lib/site/links";
import type { Locale } from "@/lib/types";

import type { ImageHeroSize } from "./imageHeroConfig";
import { BodyText, HeadingText, LineBreaks } from "./content";
import type { MediaValue, RichTextData, SiteButtonValue, TextOrRichText } from "./content";

// The original markup gives every hero picture these attributes, whatever the file's own size.
const HERO_IMAGE_SIZE = 440;
const MAP_ANCHOR = "#location-map";

export interface ImageHeroCrumb {
  text?: string | null;
  link?: SiteLinkValue | null;
}

/**
 * The `has-image` hero. A Page renders it from its block; a record template renders it from the
 * record's own fields, passing plain text where the record has no rich text.
 */
export interface ImageHeroProps {
  locale: Locale;
  size?: ImageHeroSize | null;
  crumbs?: ImageHeroCrumb[] | null;
  heading?: TextOrRichText;
  subheading?: string | null;
  reviewer?: RichTextData;
  text?: TextOrRichText;
  address?: string | null;
  button?: SiteButtonValue;
  phone?: string | null;
  phoneLabel?: string | null;
  image?: MediaValue;
  mobileImage?: MediaValue;
}

function Breadcrumbs({ crumbs, locale }: { crumbs: ImageHeroCrumb[]; locale: string }) {
  return (
    <div className="breadcrumbs">
      {crumbs.map((crumb, index) => {
        const href = siteLinkHref(crumb.link, locale);

        return (
          <React.Fragment key={index}>
            {index > 0 && " / "}
            {href ? (
              <a href={href} {...siteLinkTarget(crumb.link)}>
                {crumb.text}
              </a>
            ) : (
              <span>{crumb.text}</span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function ImageHero({
  locale,
  size,
  crumbs,
  heading,
  subheading,
  reviewer,
  text,
  address,
  button,
  phone,
  phoneLabel,
  image,
  mobileImage,
}: ImageHeroProps) {
  const visibleCrumbs = (crumbs ?? []).filter((crumb) => crumb.text);
  const phoneHref = telHref(phone);
  const hasMobileImage = Boolean(mediaOf(mobileImage));

  return (
    <section className={size === "large" ? "has-image large" : "has-image"} id="hero">
      <div className="container">
        <div className="text-container">
          {visibleCrumbs.length > 0 && <Breadcrumbs crumbs={visibleCrumbs} locale={locale} />}
          <h1>
            <HeadingText value={heading} />
          </h1>
          {subheading && <h2>{subheading}</h2>}
          {hasRichText(reviewer) && (
            <div className="reviewer">
              <SiteRichText data={reviewer} locale={locale} />
            </div>
          )}
          <BodyText locale={locale} value={text} />
          {address?.trim() && (
            <p>
              <a className="scroll-link" href={MAP_ANCHOR}>
                <LineBreaks value={address.trim()} />
              </a>
            </p>
          )}
          <SiteButton button={button} locale={locale} />
          {phoneHref && (
            <p>
              {phoneLabel ? `${phoneLabel} ` : ""}
              <a href={phoneHref}>{phone}</a>
            </p>
          )}
        </div>
        {mediaOf(image) && (
          <figure className="bg-wrapper">
            <SiteImage
              className="bg-container first desktop"
              eager
              height={HERO_IMAGE_SIZE}
              media={image}
              width={HERO_IMAGE_SIZE}
            />
            {hasMobileImage && (
              <SiteImage
                className="bg-container first mobile"
                eager
                height={HERO_IMAGE_SIZE}
                media={mobileImage}
                width={HERO_IMAGE_SIZE}
              />
            )}
          </figure>
        )}
      </div>
    </section>
  );
}

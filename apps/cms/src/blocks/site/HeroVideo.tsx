import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";
import React from "react";

import { SiteButton } from "@/components/site/SiteButton";
import { SiteImage, mediaUrl } from "@/components/site/SiteImage";
import { InlineRichText, SiteRichText } from "@/components/site/SiteRichText";
import { telHref } from "@/lib/site/links";
import type { HeroBannerBlock, HeroVideoBlock } from "@/payload-types";

import type { SiteBlockProps } from "./types";

export function HeroVideoComponent({
  heading,
  text,
  button,
  phone,
  phoneLabel,
  videoUrl,
  poster,
  locale,
}: SiteBlockProps<HeroVideoBlock>) {
  const video = stripMarkers(videoUrl);

  return (
    <section className="has-video" id="hero">
      <div className="container">
        <h1 className="hero-title">
          <InlineRichText data={heading} />
        </h1>
        <SiteRichText data={text} locale={locale} />
        <p>
          <SiteButton button={button} locale={locale} />
          {phone && (
            <>
              <br />
              <a href={telHref(phone)}>
                {phoneLabel ? `${phoneLabel} ` : ""}
                {phone}
              </a>
            </>
          )}
        </p>
      </div>
      {video && (
        <div className="video-container">
          <div>
            <figure className="video">
              <video
                autoPlay
                loop
                muted
                playsInline
                poster={mediaUrl(poster)}
                preload="auto"
                src={video}
              />
            </figure>
          </div>
        </div>
      )}
    </section>
  );
}

export function HeroBannerComponent({
  heading,
  subheading,
  text,
  button,
  image,
  locale,
}: SiteBlockProps<HeroBannerBlock>) {
  const hasImage = Boolean(mediaUrl(image));

  return (
    <section className={hasImage ? "has-image " : "simple"} id="hero">
      <div className="container">
        <div className="text-container">
          <h1>
            <InlineRichText data={heading} />
          </h1>
          {subheading && <h2>{subheading}</h2>}
          <SiteRichText data={text} locale={locale} />
          <SiteButton button={button} locale={locale} />
        </div>
        {hasImage && (
          <figure className="bg-wrapper">
            <SiteImage className="bg-container first desktop" eager media={image} />
            <SiteImage className="bg-container first mobile" eager media={image} />
          </figure>
        )}
      </div>
    </section>
  );
}

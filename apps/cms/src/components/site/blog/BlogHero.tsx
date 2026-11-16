import React from "react";

import type { SiteBlockProps } from "@/blocks/site/types";
import { SiteImage, mediaOf, mediaUrl } from "@/components/site/SiteImage";
import { getServerSideURL } from "@/lib/utils/getURL";
import type { BlogHeroBlock } from "@/payload-types";

import { findFeaturedPost, postByline, postCategories, postPath, tagPath } from "./blogData";
import { HeroByline, ReadTime } from "./PostCard";
import { ShareLinks } from "./ShareLinks";

/** The blog index's top section: the blog's name and the featured article beside it. */
export async function BlogHeroComponent({
  logo,
  heading,
  text,
  post,
  badge,
  buttonText,
  locale,
}: SiteBlockProps<BlogHeroBlock>) {
  const featured = await findFeaturedPost(post, locale);
  const byline = featured ? postByline(featured, locale) : null;
  const [category] = featured ? postCategories(featured) : [];
  const href = featured ? postPath(featured, locale) : undefined;
  const button =
    buttonText && href ? (
      <a className="button" href={href}>
        {buttonText}
      </a>
    ) : null;

  return (
    <section id="hero">
      <div className="container">
        <div id="blog-header">
          {mediaOf(logo) && (
            <figure id="blog-logo">
              <SiteImage className="not-lazy" eager media={logo} />
            </figure>
          )}
          <h1>{heading}</h1>
          {text && (
            <div className="blurb-mobile">
              <p>{text}</p>
            </div>
          )}
        </div>
        {featured && href && (
          <div id="hero-content">
            <ShareLinks
              image={mediaUrl(featured.heroImage)}
              title={featured.title}
              url={`${getServerSideURL()}${href}`}
            />
            <div className="mid-screen-details">
              {byline && <HeroByline byline={byline} />}
              {button}
            </div>
            <a aria-label={featured.title} className="bg-wrapper" href={href}>
              <SiteImage
                className="bg-container first"
                eager
                height={440}
                media={featured.heroImage}
                width={440}
              />
              {badge && <span className="pink">{badge}</span>}
            </a>
            <div className="text-container">
              <ReadTime locale={locale} post={featured} />
              {category && <a href={tagPath(category, locale)}>{category.title}</a>}
              <h2>
                <a className="blog-title-link" href={href}>
                  {featured.title}
                </a>
              </h2>
              <div className="details">
                {byline && <HeroByline byline={byline} />}
                {button}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

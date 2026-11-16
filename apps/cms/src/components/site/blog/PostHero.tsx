import React from "react";

import { SiteImage, mediaUrl } from "@/components/site/SiteImage";
import { getServerSideURL } from "@/lib/utils/getURL";
import type { Post } from "@/payload-types";

import type { BlogIdentity } from "./blogData";
import { postByline, postCategories, postPath, tagPath } from "./blogData";
import { formatBlogDate, blogLabels } from "./labels";
import { HeroByline } from "./PostCard";
import { ShareLinks } from "./ShareLinks";

function dateLine(post: Post, locale: string): string | null {
  const labels = blogLabels(locale);

  if (post.updatedDate) {
    return `${labels.updated} ${formatBlogDate(post.updatedDate, locale)}`;
  }

  return post.publishedAt
    ? `${labels.published} ${formatBlogDate(post.publishedAt, locale)}`
    : null;
}

/** An article's top section: breadcrumbs, share buttons, byline, date, picture and title. */
export function PostHero({
  post,
  blog,
  locale,
}: {
  post: Post;
  blog: BlogIdentity;
  locale: string;
}) {
  const byline = postByline(post, locale);
  const [category] = postCategories(post);
  const date = dateLine(post, locale);
  const details = (
    <>
      {byline && <HeroByline byline={byline} />}
      {date && <p className="update-date">{date}</p>}
    </>
  );

  return (
    <section id="hero">
      <div className="container">
        <div id="blog-header">
          <div className="breadcrumbs">
            <a href={blog.href}>{blog.title}</a>
            {category && (
              <>
                <span className="divider" />
                <a href={tagPath(category, locale)}>{category.title}</a>
              </>
            )}
          </div>
        </div>
        <div id="hero-content">
          <ShareLinks
            image={mediaUrl(post.heroImage)}
            title={post.title}
            url={`${getServerSideURL()}${postPath(post, locale)}`}
          />
          <div className="mid-screen-details">{details}</div>
          <div className="bg-wrapper">
            <SiteImage
              alt=""
              className="bg-container first"
              eager
              height={440}
              media={post.heroImage}
              width={440}
            />
          </div>
          <div className="text-container">
            {category && <a href={tagPath(category, locale)}>{category.title}</a>}
            <h1>{post.title}</h1>
            <figure className="mobile-image">
              <SiteImage alt="" media={post.heroImage} />
            </figure>
            <div className="details">{details}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

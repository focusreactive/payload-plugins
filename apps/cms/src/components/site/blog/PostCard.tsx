import React from "react";

import { SiteImage } from "@/components/site/SiteImage";
import type { Post } from "@/payload-types";

import { postByline, postPath, postReadingTime } from "./blogData";
import type { PostByline } from "./blogData";
import { blogLabels } from "./labels";

/** The reviewer or author line of an article card. */
export function CardByline({ byline }: { byline: PostByline }) {
  return (
    <div className={byline.kind}>
      <figure className="circle">
        <SiteImage media={byline.photo} />
      </figure>
      <p>
        <span className="snippet-author">{byline.label} </span>
        {byline.name}
      </p>
    </div>
  );
}

/** The byline of an article's top section: the reviewer's full name links to the doctor's page. */
export function HeroByline({ byline }: { byline: PostByline }) {
  return (
    <div className={byline.kind}>
      <figure className="circle">
        <SiteImage className="not-lazy" eager media={byline.photo} />
      </figure>
      <p>
        {byline.label} {byline.href ? <a href={byline.href}>{byline.fullName}</a> : byline.fullName}
      </p>
    </div>
  );
}

export function ReadTime({ post, locale }: { post: Post; locale: string }) {
  const minutes = postReadingTime(post);

  return minutes ? <div className="read-time">{blogLabels(locale).readTime(minutes)}</div> : null;
}

/** An article card (`a.snippet-link`), the same in the trending row, the list and every slider. */
export function PostCard({ post, locale }: { post: Post; locale: string }) {
  const byline = postByline(post, locale);

  return (
    <a className="snippet-link" href={postPath(post, locale)}>
      <div className="bg-wrapper">
        <SiteImage className="bg-container" height={440} media={post.heroImage} width={440} />
      </div>
      <div className="content-wrapper">
        <div className="tag-and-time-wrapper">
          <ReadTime locale={locale} post={post} />
        </div>
        <h4>{post.title}</h4>
        {byline && <CardByline byline={byline} />}
      </div>
    </a>
  );
}

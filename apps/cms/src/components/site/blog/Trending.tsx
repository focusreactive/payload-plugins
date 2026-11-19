import React from "react";

import type { SiteBlockProps } from "@/blocks/site/types";
import type { TrendingBlock } from "@/payload-types";

import { findPosts } from "./blogData";
import { PostCard } from "./PostCard";

const NEWEST_COUNT = 3;

export async function TrendingComponent({ heading, posts, locale }: SiteBlockProps<TrendingBlock>) {
  const postDocs = await findPosts(locale, { limit: NEWEST_COUNT, picked: posts });

  return (
    <section id="trending-articles">
      <div className="container">
        {heading && <h2>{heading}</h2>}
        <ul className="trending-articles-wrapper">
          {postDocs.map((post) => (
            <li className="blog-post-card trending" key={post.id}>
              <PostCard locale={locale} post={post} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";
import React from "react";

import type { SiteBlockProps } from "@/blocks/site/types";
import { idOf } from "@/dal/entities";
import type { BlogListBlock, Category } from "@/payload-types";

import { BlogBlurb } from "./BlogBlurb";
import { BlogListClient } from "./BlogListClient";
import {
  blogIndexPath,
  findFeaturedPost,
  findPosts,
  getBlogIdentity,
  postCategories,
  tagPath,
} from "./blogData";
import { PostCard } from "./PostCard";

const DEFAULT_PAGE_SIZE = 8;

/** Every article but the featured one, with the tag filter beside it; filtered and paged in the browser. */
export async function BlogListComponent({
  tagsTitle,
  allText,
  tags,
  heading,
  moreText,
  pageSize,
  locale,
}: SiteBlockProps<BlogListBlock>) {
  const blog = await getBlogIdentity(locale);
  const [featured, posts] = await Promise.all([
    findFeaturedPost(blog.featured, locale),
    findPosts(locale, {}),
  ]);
  const listed = posts.filter((post) => post.id !== featured?.id);
  const tagDocs = (tags ?? []).filter(
    (tag): tag is Category => typeof tag === "object" && tag !== null
  );

  return (
    <BlogListClient
      allHref={blogIndexPath(locale)}
      allText={allText}
      blurb={<BlogBlurb blog={blog} />}
      cards={listed.map((post) => ({
        card: <PostCard locale={locale} post={post} />,
        id: String(idOf(post)),
        tags: postCategories(post).map((category) => stripMarkers(category.slug) ?? ""),
      }))}
      heading={heading}
      moreText={moreText}
      pageSize={pageSize ?? DEFAULT_PAGE_SIZE}
      tags={tagDocs.map((tag) => ({
        href: tagPath(tag, locale),
        slug: stripMarkers(tag.slug) ?? "",
        title: tag.title,
      }))}
      tagsTitle={tagsTitle}
    />
  );
}

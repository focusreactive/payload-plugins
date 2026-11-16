import React from "react";

import { mediaUrl } from "@/components/site/SiteImage";
import { getServerSideURL } from "@/lib/utils/getURL";
import type { Post } from "@/payload-types";

import { ArticleContents } from "./ArticleContents";
import { ArticleFaq } from "./ArticleFaq";
import { ArticleRichText, articleHeadings, nextHeadingId } from "./ArticleRichText";
import { BlogBlurb } from "./BlogBlurb";
import type { BlogIdentity } from "./blogData";
import { postCategories, postPath, tagPath } from "./blogData";
import { DoctorSnippet } from "./DoctorSnippet";
import { blogLabels } from "./labels";
import { ShareLinks } from "./ShareLinks";

/** The article itself: share buttons and contents beside the text, questions, doctor and tags. */
export function Article({
  post,
  blog,
  locale,
}: {
  post: Post;
  blog: BlogIdentity;
  locale: string;
}) {
  const labels = blogLabels(locale);
  const headings = articleHeadings(post.content);
  const faqHeading = post.faq?.heading?.title;
  const faqItems = post.faq?.items ?? [];
  const faqHeadingId = nextHeadingId(headings);
  const contents =
    faqHeading && faqItems.length > 0
      ? [...headings, { id: faqHeadingId, text: faqHeading }]
      : headings;
  const reviewer = typeof post.reviewedBy === "object" ? post.reviewedBy : null;
  const categories = postCategories(post);

  return (
    <section id="blog-sidebar">
      <div className="container">
        <div id="sidebar">
          <ShareLinks
            image={mediaUrl(post.heroImage)}
            title={post.title}
            url={`${getServerSideURL()}${postPath(post, locale)}`}
          />
          {contents.length > 0 && <ArticleContents headings={contents} title={labels.contents} />}
        </div>
        <div id="content">
          <ArticleRichText data={post.content} locale={locale} />
          {faqItems.length > 0 && (
            <ArticleFaq
              heading={faqHeading}
              headingId={faqHeadingId}
              items={faqItems.map((item, index) => ({
                answer: <ArticleRichText data={item.answer} locale={locale} />,
                id: item.id ?? String(index),
                question: item.question,
              }))}
            />
          )}
          {reviewer && <DoctorSnippet doctor={reviewer} locale={locale} />}
          {categories.length > 0 && (
            <div className="tags-container">
              <div className="title">{labels.tags}</div>
              <ul className="tags">
                {categories.map((category) => (
                  <li key={category.id}>
                    <a className="button small-pink" href={tagPath(category, locale)}>
                      {category.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <BlogBlurb blog={blog} />
        </div>
      </div>
    </section>
  );
}

import { getServerSideURL } from "@/core/lib/getURL";
import type { Locale } from "@/core/types";
import { buildUrl } from "@/core/utils/path/buildUrl";
import type { Media, Post } from "@/payload-types";

import { formatAuthorsToSchema } from "../lib/formatAuthorsToSchema";

interface ArticleSchemaParams {
  post: Post;
  siteName?: string;
  locale: Locale;
}

export function createArticleSchema({
  post,
  siteName,
  locale,
}: ArticleSchemaParams) {
  const postUrl = buildUrl({
    collection: "posts",
    locale,
    slug: post.slug,
  });
  const baseUrl = getServerSideURL();
  const image = post.meta?.image as Media | undefined;
  const imageUrl =
    image && typeof image === "object" ? `${baseUrl}${image.url}` : undefined;
  const authors = formatAuthorsToSchema(post.authors);

  const publisher = siteName
    ? {
        "@type": "Organization",
        name: siteName,
        url: buildUrl({ collection: "page", locale }),
      }
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    inLanguage: locale,
    mainEntityOfPage: {
      "@id": postUrl,
      "@type": "WebPage",
      inLanguage: locale,
    },
    url: postUrl,
    ...(post.meta?.description && { description: post.meta.description }),
    ...(imageUrl && { image: imageUrl }),
    ...(post.publishedAt && {
      datePublished: new Date(post.publishedAt).toISOString(),
    }),
    ...(post.updatedAt && {
      dateModified: new Date(post.updatedAt).toISOString(),
    }),
    ...(authors &&
      authors.length > 0 && {
        author: authors.length === 1 ? authors[0] : authors,
      }),
    ...(publisher && { publisher }),
  };
}

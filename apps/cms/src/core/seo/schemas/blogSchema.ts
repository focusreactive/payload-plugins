import { getServerSideURL } from "@/core/lib/getURL";
import type { Locale } from "@/core/types";
import { buildUrl } from "@/core/utils/path/buildUrl";
import type { BlogPageSettingsData } from "@/dal/getBlogPageSettings";
import type { Media, Post } from "@/payload-types";

import { formatAuthorsToSchema } from "../lib/formatAuthorsToSchema";

type PostPreview = Pick<
  Post,
  "title" | "slug" | "publishedAt" | "updatedAt" | "authors" | "meta"
>;

interface BlogSchemaParams {
  settings: BlogPageSettingsData;
  posts: PostPreview[];
  siteName?: string;
  locale: Locale;
}

export function createBlogSchema({
  settings,
  posts,
  siteName,
  locale,
}: BlogSchemaParams) {
  const baseUrl = getServerSideURL();
  const blogUrl = buildUrl({ collection: "posts", locale });

  const description =
    settings.blogMeta?.description || settings.blogDescription || "";

  const publisher = siteName
    ? {
        "@type": "Organization",
        name: siteName,
        url: baseUrl,
      }
    : undefined;

  const blogPostings = posts.map((post) => {
    const postUrl = buildUrl({ collection: "posts", locale, slug: post.slug });
    const image = post.meta?.image as Media | undefined;
    const imageUrl =
      image && typeof image === "object" ? `${baseUrl}${image.url}` : undefined;

    const authors = formatAuthorsToSchema(post.authors);

    return {
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
  });

  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    inLanguage: locale,
    mainEntityOfPage: {
      "@id": blogUrl,
      "@type": "WebPage",
      inLanguage: locale,
    },
    name: settings.blogTitle || "Blog",
    url: blogUrl,
    ...(description && { description }),
    ...(publisher && { publisher }),
    ...(blogPostings.length > 0 && { blogPost: blogPostings }),
  };
}

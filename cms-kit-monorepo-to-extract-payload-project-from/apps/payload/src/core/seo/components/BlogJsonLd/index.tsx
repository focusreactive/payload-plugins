import React from "react";

import type { BlogPageSettingsData } from "@/core/lib/getBlogPageSettings";
import { createBlogSchema } from "@/core/seo/schemas";
import type { Locale } from "@/core/types";
import type { Post } from "@/payload-types";

import { JsonLd } from "../JsonLd";

type PostPreview = Pick<
  Post,
  "title" | "slug" | "publishedAt" | "updatedAt" | "authors" | "meta"
>;

interface BlogJsonLdProps {
  settings: BlogPageSettingsData;
  posts: PostPreview[];
  siteName?: string;
  locale: Locale;
}

export function BlogJsonLd({
  settings,
  posts,
  siteName,
  locale,
}: BlogJsonLdProps) {
  const structuredData = createBlogSchema({
    locale,
    posts,
    settings,
    siteName,
  });
  return <JsonLd data={structuredData} />;
}

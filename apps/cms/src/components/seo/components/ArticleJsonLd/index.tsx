import React from "react";

import { createArticleSchema } from "@/components/seo/schemas";
import type { Locale } from "@/lib/types";
import type { Post } from "@/payload-types";

import { JsonLd } from "../JsonLd";

interface ArticleJsonLdProps {
  post: Post;
  siteName?: string;
  locale: Locale;
}

export function ArticleJsonLd({ post, siteName, locale }: ArticleJsonLdProps) {
  const structuredData = createArticleSchema({ locale, post, siteName });
  return <JsonLd data={structuredData} />;
}

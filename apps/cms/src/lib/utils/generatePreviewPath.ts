import type { BLOG_CONFIG } from "@/lib/config/blog";
import type { CAREERS_CONFIG } from "@/lib/config/careers";
import type { NEWS_CONFIG } from "@/lib/config/news";

interface Props {
  collection:
    | "page"
    | typeof BLOG_CONFIG.collection
    | typeof CAREERS_CONFIG.collection
    | typeof NEWS_CONFIG.collection;
  slug: string;
  path: string;
}

export const generatePreviewPath = ({ collection, slug, path }: Props) => {
  const params: Record<string, string> = {
    collection,
    path,
    previewSecret: process.env.PREVIEW_SECRET || "",
    slug,
  };

  const encodedParams = new URLSearchParams(params);
  const url = `/next/preview?${encodedParams.toString()}`;

  return url;
};

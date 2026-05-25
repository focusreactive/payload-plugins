import type { BLOG_CONFIG } from "@/core/config/blog";

interface Props {
  collection: "page" | typeof BLOG_CONFIG.collection;
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

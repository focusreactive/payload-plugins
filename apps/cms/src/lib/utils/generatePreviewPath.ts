import type { BLOG_CONFIG } from "@/lib/config/blog";
import type { EntityCollection } from "@/lib/config/entityRoutes";

interface Props {
  collection: "page" | "globalBlock" | typeof BLOG_CONFIG.collection | EntityCollection;
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

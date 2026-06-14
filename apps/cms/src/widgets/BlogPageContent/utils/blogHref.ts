import { BLOG_CONFIG } from "@/core/config/blog";

interface BlogHrefParams {
  category?: string;
  q?: string;
}

export function blogHref({ category, q }: BlogHrefParams): string {
  const params = new URLSearchParams();

  if (category) {
    params.set("category", category);
  }
  if (q) {
    params.set("q", q);
  }

  const queryString = params.toString();

  return queryString ? `${BLOG_CONFIG.basePath}?${queryString}` : BLOG_CONFIG.basePath;
}

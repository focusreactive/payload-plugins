import { BLOG_CONFIG } from "@/lib/config/blog";

export function blogHref({ q }: { q?: string }): string {
  return q
    ? `${BLOG_CONFIG.basePath}?${new URLSearchParams({ q }).toString()}`
    : BLOG_CONFIG.basePath;
}

import { BlogJsonLd, BreadcrumbsJsonLd } from "@/core/seo/components";
import type { Locale } from "@/core/types";
import {
  getBlogPageSettings,
  getPayloadClient,
  getPosts,
  getSiteSettings,
} from "@/dal";

interface BlogJsonLdWrapperProps {
  searchParams: Promise<{
    page?: string;
  }>;
  locale: Locale;
}

export async function BlogJsonLdWrapper({
  searchParams,
  locale,
}: BlogJsonLdWrapperProps) {
  const { page } = await searchParams;
  const pageNumber = page ? Number.parseInt(page, 10) : 1;

  const payload = await getPayloadClient();

  const [posts, blogSettings, siteSettings] = await Promise.all([
    getPosts(payload, { locale, page: pageNumber }),
    getBlogPageSettings({ locale }),
    getSiteSettings({ locale }),
  ]);

  return (
    <>
      <BlogJsonLd
        settings={blogSettings}
        posts={posts.docs}
        siteName={siteSettings.siteName as string}
        locale={locale}
      />
      <BreadcrumbsJsonLd
        locale={locale}
        blog={{
          title: blogSettings.blogTitle || "Blog",
          ...(pageNumber > 1 && { page: pageNumber }),
        }}
      />
    </>
  );
}

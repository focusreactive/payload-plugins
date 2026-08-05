import config from "@payload-config";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload } from "payload";

import type { Locale } from "@/lib/locales";
import { LOCALES } from "@/lib/locales";

import { SiteHeader } from "../../_components/SiteHeader";

export default async function BlogIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  if (!LOCALES.includes(locale as Locale)) {
    notFound();
  }

  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "posts",
    locale: locale as Locale,
    limit: 50,
    sort: "-publishedAt",
  });

  return (
    <>
      <SiteHeader locale={locale as Locale} />
      <main className="wrap">
        <h1>Blog</h1>
        <ul className="post-list">
          {result.docs.map((post) => (
            <li key={post.id}>
              <Link href={`/${locale}/blog/${post.slug}`}>{post.title}</Link>
              <p className="muted">{post.excerpt}</p>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
